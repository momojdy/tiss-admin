import {useCallback, useEffect, useRef, useState} from 'react';
import {previewBackend as supabase} from './previewRuntime';
import {S, STB, emit} from './store';
import {label} from './content';

const reviewListeners = new Set<(storeId: string) => void>();
export async function notifyStoreReviewsChanged(storeId: string) {
  reviewListeners.forEach(listener => listener(storeId));
  const store = STB[storeId], account = S.accountId;
  if (!store?.businessId) return;
  try {
    const {data, error} = await supabase.rpc('goodies_store_review_summaries', {p_business_ids: [store.businessId]});
    if (error || !Array.isArray(data)) throw error || new Error('Invalid rating response');
    if (S.accountId !== account || STB[storeId] !== store) return;
    const summary = data.find((row: any) => row.business_id === store.businessId);
    const rating = summary ? Number(summary.rating) : 0, count = summary ? Number(summary.review_count) : 0;
    if (!Number.isFinite(rating) || rating < 0 || rating > 5 || !Number.isSafeInteger(count) || count < 0) throw new Error('Invalid rating response');
    store.r = rating;store.rv = count;
    store.ratingsAvailable = true;
  } catch {if (S.accountId === account && STB[storeId] === store) store.ratingsAvailable = false;}
  if (S.accountId === account && STB[storeId] === store) emit();
}

type ReviewPage = {key: string; rows: any[]; loading: boolean; error: boolean; hasMore: boolean};
export function useStoreReviews(storeId: string) {
  const accountId = S.accountId;
  const requestKey = JSON.stringify([accountId || '', storeId]);
  const [page, setPage] = useState<ReviewPage>({key: '', rows: [], loading: true, error: false, hasMore: false});
  const offset = useRef(0), generation = useRef(0), inFlight = useRef(false), refreshPending = useRef(false);
  const load = useCallback(async function loadPage(more = false): Promise<void> {
    if (inFlight.current) {if (!more) refreshPending.current = true;return;}
    const epoch = generation.current, account = accountId;
    inFlight.current = true;
    setPage(old => ({...(old.key === requestKey ? old : {key: requestKey, rows: [], hasMore: false}), loading: true, error: false}));
    try {
      const {data, error: failure} = await supabase.rpc('goodies_store_reviews', {p_store_id: storeId, p_offset: more ? offset.current : 0, p_limit: 20});
      if (failure || !Array.isArray(data)) throw failure || new Error('Invalid review response');
      if (generation.current !== epoch || S.accountId !== account) return;
      offset.current = (more ? offset.current : 0) + data.length;
      setPage(old => ({key: requestKey, rows: more && old.key === requestKey ? [...old.rows, ...data] : data, loading: false, error: false, hasMore: data.length === 20}));
    } catch {
      if (generation.current === epoch && S.accountId === account) setPage(old => ({...old, error: true}));
    } finally {
      if (generation.current === epoch && S.accountId === account) {
        inFlight.current = false;
        setPage(old => ({...old, loading: false}));
        if (refreshPending.current) {refreshPending.current = false;void loadPage();}
      }
    }
  }, [storeId, accountId, requestKey]);
  useEffect(() => {
    const epoch = ++generation.current;
    inFlight.current = false;refreshPending.current = false;offset.current = 0;
    void load();
    const listener = (changedStore: string) => {if (changedStore === storeId) void load();};
    reviewListeners.add(listener);
    return () => {reviewListeners.delete(listener);generation.current = epoch + 1;};
  }, [load, storeId]);
  const current = page.key === requestKey;
  return {rows: current ? page.rows.map((r: any) => ({orderId: r.order_id, n: r.is_mine ? label('lbl.reviewYou', 'You') : label('lbl.reviewCustomer', 'Customer'), r: r.rating, t: r.comment, d: new Date(r.created_at).toLocaleDateString(S.lang), you: r.is_mine})) : [], loading: !current || page.loading, error: current && page.error, hasMore: current && page.hasMore, reload: () => load(), more: () => load(true)};
}
