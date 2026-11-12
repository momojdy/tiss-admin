import {applyOrderReviews} from './orderReviews';
import {wantissLocale} from './previewLocales';
import {CUSTOMER_NOTIFICATION_FILTER} from './notifications';
import { AppState, type AppStateStatus } from 'react-native';
import {previewBackend as supabase} from './previewRuntime';
import { S, STB, IT, emit, save, switchGoodiesAccount, refreshUserAddresses } from './store';

type ServerOrder = {
  id: string;
  order_code: string;
  parent_id: string | null;
  stop_index: number | null;
  store_id: string;
  status: string;
  created_at: string;
  scheduled_for: string | null;
  order_type: string;
  items: any;
  subtotal: number | string;
  delivery_fee: number | string;
  service_fee: number | string;
  discount: number | string;
  tip: number | string;
  total: number | string;
  notes: string | null;
  address: any;
  contact_phone: string | null;
  payment_method: string | null;
  payment_status: string | null;
  promo_code: string | null;
  updated_at: string;
};

const stageByStatus: Record<string, number> = {
  scheduled: 0,
  placed: 0,
  accepted: 1,
  preparing: 2,
  ready: 3,
  completed: 6,
  cancelled: 0,
  declined: 0,
  expired: 0,
};

function mapOrder(row: ServerOrder) {
  const sid = String(row.store_id || '');
  const pk = row.order_type === 'pickup';
  const address = row.address && typeof row.address === 'object' ? row.address : null;
  const items = Array.isArray(row.items) ? row.items : [];
  return {
    id: String(row.order_code || row.id),
    backendId: row.id,
    parentId: row.parent_id || undefined,
    stop: row.stop_index == null ? undefined : Number(row.stop_index),
    serverStatus: String(row.status || 'placed').toLowerCase(),
    serverUpdatedAt: row.updated_at,
    serverCreatedAt: row.created_at,
    sid,
    lines: items.map((item: any) => ({...item, photo: item?.photo || IT[String(item?.id || '')]?.photo || null})),
    sn: STB[sid]?.n || 'Store',
    sub: Number(row.subtotal || 0),
    fee: Number(row.delivery_fee || 0),
    svc: Number(row.service_fee || 0),
    disc: Number(row.discount || 0),
    tip: Number(row.tip || 0),
    total: Number(row.total || 0),
    t0: Date.parse(row.created_at) || Date.now(),
    st: stageByStatus[String(row.status || '').toLowerCase()] ?? 0,

    cx: ['cancelled', 'declined', 'expired'].includes(String(row.status || '').toLowerCase()) ? 1 : 0,
    pk,
    addr: pk ? (STB[sid]?.n || 'Store') : String(address?.t || ''),
    ad: pk ? null : address,
    ph: String(row.contact_phone || ''),
    pay: String(row.payment_method || 'cash').toLowerCase(),
    payStatus: row.payment_status || null,
    note: String(row.notes || ''),
    sch: row.scheduled_for ? Date.parse(row.scheduled_for) || 0 : 0,
    promo: String(row.promo_code || ''),
  };
}

async function readOrderReviews(orders: any[], account: string) {
  if (!orders.length) return;
  const {data, error} = await supabase.from('goodies_order_reviews').select('order_id,target,rating,comment,created_at')
    .eq('customer_id', account).in('order_id', orders.map(order => order.backendId));
  if (!error && Array.isArray(data)) applyOrderReviews(orders, data, S.lang);
}

export async function fetchGoodiesOrderForNotification(orderId?: string, orderCode?: string) {
  const {data: auth, error: authError} = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error('Please sign in again.');
  let query = supabase.from('goodies_orders')
    .select('id,order_code,parent_id,stop_index,store_id,status,created_at,scheduled_for,order_type,items,subtotal,delivery_fee,service_fee,discount,tip,total,notes,address,contact_phone,payment_method,payment_status,promo_code,updated_at')
    .eq('customer_id', auth.user.id);
  if (orderId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)) query = query.eq('id', orderId);
  else if (orderCode || orderId) query = query.eq('order_code', orderCode || orderId);
  else return null;
  const {data, error} = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (S.accountId !== auth.user.id) return null;
  const mapped = mapOrder(data as ServerOrder);
  const cached = (S.orders || []).find((order: any) => order?.backendId === mapped.backendId);
  const order = {...cached, ...mapped};
  await readOrderReviews([order], auth.user.id);
  if (S.accountId !== auth.user.id) return null;
  S.orders = [order, ...(S.orders || []).filter((item: any) => item?.backendId !== mapped.backendId)];
  save(); emit();
  return order.id;
}

let activeRefresh: (() => Promise<void>) | null = null;
export const refreshGoodiesOrders = async () => {await activeRefresh?.();};

export function startGoodiesSync() {
  let stopped = false;
  let userId: string | null = null;
  let generation = 0;
  let authEpoch = 0;
  let refreshing = false;
  let refreshAgain = false;
  let poll: ReturnType<typeof setInterval> | null = null;
  let authTimer: ReturnType<typeof setTimeout> | null = null;
  let channel: ReturnType<typeof supabase.channel> | null = null;
  let appStateSub: { remove: () => void } | null = null;

  const clearChannel = () => {
    if (channel) {
      const old = channel;
      channel = null;
      void supabase.removeChannel(old);
    }
  };

  const clearAccountState = () => {
    S.firstOrderEligible = null;
    S.serverUnread = 0;
    S.wallet = 0;
    S.hasWallet = false;
    S.cards = [];
    S.selectedCardId = '';
    S.orders = (S.orders || []).filter((order: any) => !order?.backendId);
    save();
    emit();
  };

  const refresh = async () => {
    if (stopped || !userId) return;
    if (refreshing) {
      refreshAgain = true;
      return;
    }
    refreshing = true;
    let refreshAccount = userId;
    S.ordersLoading = true;emit();
    try {
      do {
        refreshAgain = false;
        const requestUserId: string = userId;refreshAccount=requestUserId;
        const requestGeneration = generation;
        const [unreadResult, ordersResult, walletResult, profileResult, settingsResult] = await Promise.all([
          supabase.from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', requestUserId)
            .ilike('feature_name', 'goodies')
            .or(CUSTOMER_NOTIFICATION_FILTER)
            .eq('read', false),
          supabase.from('goodies_orders')
            .select('id,order_code,parent_id,stop_index,store_id,status,created_at,scheduled_for,order_type,items,subtotal,delivery_fee,service_fee,discount,tip,total,notes,address,contact_phone,payment_method,payment_status,promo_code,updated_at')
            .eq('customer_id', requestUserId)
            .order('created_at', { ascending: false }).order('id', {ascending: false})
            .limit(100),
          supabase.from('wallets').select('id,balance').eq('user_id', requestUserId).maybeSingle(),
          supabase.from('profiles').select('full_name,email,phone_number,avatar_url').eq('id', requestUserId).maybeSingle(),
          supabase.from('user_settings').select('language,notification_preferences').eq('user_id',requestUserId).maybeSingle(),
        ]);
        if (stopped || requestGeneration !== generation || requestUserId !== userId) continue;

        S.ordersLoading = false;
        let changed = false;
        if (!settingsResult.error && settingsResult.data) {
          const prefs = settingsResult.data.notification_preferences || {};
          S.np = {orders: (prefs.goodies_orders ?? prefs.orders) === false ? 0 : 1, promos: (prefs.goodies_promos ?? prefs.promotions) === false ? 0 : 1};
          changed = true;
        }
        if (!settingsResult.error) {const locale=wantissLocale(settingsResult.data?.language);if(S.lang!==locale){S.lang=locale;changed=true;}}
        if (!profileResult.error && profileResult.data) {
          const profile = profileResult.data;
          S.pf = {n: profile.full_name || '', e: profile.email || '', ph: profile.phone_number || '', av: profile.avatar_url || ''};
          changed = true;
        }
        if (!unreadResult.error) {
          const nextUnread = Number(unreadResult.count || 0);
          if (S.serverUnread !== nextUnread) {
            S.serverUnread = nextUnread;
            changed = true;
          }
        }

        if (!walletResult.error) {
          S.hasWallet = !!walletResult.data?.id;
          S.wallet = Number(walletResult.data?.balance || 0);
          changed = true;
        }

        if (!ordersResult.error) {
          S.firstOrderEligible = (ordersResult.data || []).length === 0;
          const cached = new Map<string, any>(
            (S.orders || []).filter((order: any) => order?.backendId).map((order: any) => [String(order.backendId), order]),
          );
          const serverOrders = ((ordersResult.data || []) as ServerOrder[]).map(row => ({
            ...(cached.get(String(row.id)) || {}),
            ...mapOrder(row),
          }));
          await readOrderReviews(serverOrders, requestUserId);
          if(stopped || requestGeneration!==generation || requestUserId!==userId)continue;
          S.ordersError = '';
          const lastRow = ordersResult.data?.[ordersResult.data.length - 1];
          const boundary = lastRow ? `${lastRow.created_at}:${lastRow.id}` : '';
          if(S.ordersPageBoundary !== boundary) {
            S.ordersPageBoundary = boundary;
            S.ordersCursor = lastRow ? {createdAt:lastRow.created_at,id:lastRow.id} : null;
            S.ordersHasMore = (ordersResult.data || []).length === 100;
          }
          const pageIds = new Set(serverOrders.map((o: any) => o.backendId));
          const localOrders = (S.orders || []).filter((order: any) => !order?.backendId || !pageIds.has(order.backendId));
          S.orders = [...serverOrders, ...localOrders].sort((a: any, b: any) => Number(b.t0 || 0) - Number(a.t0 || 0));
          changed = true;
        } else {S.ordersError = 'unavailable';changed = true;}

        if (changed) {
          save();
          emit();
        }
      } while (refreshAgain && !stopped);
    } catch {if(!stopped && refreshAccount === userId) {S.ordersError = 'unavailable';emit();}} finally {
      if(!stopped && refreshAccount===userId){S.ordersLoading=false;emit();}
      refreshing = false;
      if(refreshAgain&&!stopped&&userId)void refresh();
    }
  };

  activeRefresh = refresh;

  const applyUser = (nextUserId: string | null) => {
    if (stopped) return;
    if (nextUserId === userId) {
      if (nextUserId) void refresh();
      else {S.ordersLoading=false;emit();}
      return;
    }
    generation++;
    userId = nextUserId;
    switchGoodiesAccount(nextUserId);
    clearChannel();
    if (poll) {
      clearInterval(poll);
      poll = null;
    }
    clearAccountState();
    S.ordersLoading=!!userId;emit();
    if (!userId) return;
    void refreshUserAddresses().catch(() => {});

    const subscribedUserId = userId;
    const subscribedGeneration = generation;
    channel = supabase.channel('goodies-sync-orders-' + subscribedUserId)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'goodies_orders',
        filter: 'customer_id=eq.' + subscribedUserId,
      }, () => {
        if (!stopped && generation === subscribedGeneration) void refresh();
      })
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          if (!stopped && generation === subscribedGeneration) void refresh();
        }
      });

    poll = setInterval(() => { void refresh(); }, 60000);
    void refresh();
  };

  const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
    authEpoch++;
    if (authTimer) clearTimeout(authTimer);
    const nextUserId = session?.user?.id || null;
    authTimer = setTimeout(() => {
      authTimer = null;
      applyUser(nextUserId);
    }, 0);
  });

  const initialEpoch = authEpoch;
  void supabase.auth.getSession().then(({ data, error }) => {
    if (stopped || initialEpoch !== authEpoch) return;
    if(error){S.ordersLoading=false;S.ordersError='unavailable';emit();return;}
    applyUser(data.session?.user?.id || null);
  }).catch(() => {});

  appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active') void refresh();
  });

  return () => {
    if (stopped) return;
    stopped = true;
    if(activeRefresh === refresh) activeRefresh = null;
    generation++;
    userId = null;
    if (authTimer) clearTimeout(authTimer);
    if (poll) clearInterval(poll);
    clearChannel();
    authListener.subscription.unsubscribe();
    appStateSub?.remove();
  };
}

/** Fetch the next history page using a stable cursor, preserving newer realtime rows. */
export async function loadOlderGoodiesOrders() {
  if (S.ordersPaging) return;
  const account = S.accountId;
  const cursor = S.ordersCursor;
  if (!account || !cursor) return;
  S.ordersPaging = true;S.ordersError = '';emit();
  try {
    const {data, error} = await supabase.from('goodies_orders')
      .select('id,order_code,parent_id,stop_index,store_id,status,created_at,scheduled_for,order_type,items,subtotal,delivery_fee,service_fee,discount,tip,total,notes,address,contact_phone,payment_method,payment_status,promo_code,updated_at')
      .eq('customer_id', account)
      .or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`)
      .order('created_at',{ascending:false}).order('id',{ascending:false}).limit(100);
    if (error) throw error;
    if (S.accountId !== account) return;
    const cache = new Map<string,any>(S.orders.map((o:any)=>[o.backendId,o]));
    const page = (data || []).map(row=>({...cache.get(row.id),...mapOrder(row as ServerOrder)}));
    await readOrderReviews(page, account);
    if (S.accountId !== account) return;
    const ids = new Set(page.map(o=>o.backendId));
    S.orders = [...S.orders.filter((o:any)=>!ids.has(o.backendId)),...page].sort((a:any,b:any)=>b.t0-a.t0);
    if(S.ordersCursor===cursor) {
      const last = data?.[data.length-1];
      S.ordersCursor = last ? {createdAt:last.created_at,id:last.id} : cursor;
      S.ordersHasMore = (data || []).length === 100;
    }
    save();
  } catch {if (S.accountId === account) S.ordersError = 'unavailable';}
  finally {if (S.accountId === account) {S.ordersPaging = false;emit();}}
}
