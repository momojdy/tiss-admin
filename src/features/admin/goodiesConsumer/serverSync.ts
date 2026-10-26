import { AppState, type AppStateStatus } from 'react-native';
import { supabase } from '../lib/supabase';
import { S, STB, emit, save } from './store';

type ServerOrder = {
  id: string;
  order_code: string;
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
    serverStatus: String(row.status || 'placed').toLowerCase(),
    serverUpdatedAt: row.updated_at,
    sid,
    lines: items,
    sn: STB[sid]?.n || 'Store',
    sub: Number(row.subtotal || 0),
    fee: Number(row.delivery_fee || 0),
    svc: Number(row.service_fee || 0),
    disc: Number(row.discount || 0),
    tip: Number(row.tip || 0),
    total: Number(row.total || 0),
    t0: Date.parse(row.created_at) || Date.now(),
    st: stageByStatus[String(row.status || '').toLowerCase()] ?? 0,
    rated: 0,
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
    try {
      do {
        refreshAgain = false;
        const requestUserId: string = userId;
        const requestGeneration = generation;
        const [unreadResult, ordersResult, walletResult] = await Promise.all([
          supabase.from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', requestUserId)
            .ilike('feature_name', 'goodies')
            .eq('read', false),
          supabase.from('goodies_orders')
            .select('id,order_code,store_id,status,created_at,scheduled_for,order_type,items,subtotal,delivery_fee,service_fee,discount,tip,total,notes,address,contact_phone,payment_method,payment_status,promo_code,updated_at')
            .eq('customer_id', requestUserId)
            .order('created_at', { ascending: false })
            .limit(100),
          supabase.from('wallets').select('id,balance').eq('user_id', requestUserId).maybeSingle(),
        ]);
        if (stopped || requestGeneration !== generation || requestUserId !== userId) continue;

        let changed = false;
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
          const cached = new Map<string, any>(
            (S.orders || []).filter((order: any) => order?.backendId).map((order: any) => [String(order.backendId), order]),
          );
          const serverOrders = ((ordersResult.data || []) as ServerOrder[]).map(row => ({
            ...(cached.get(String(row.id)) || {}),
            ...mapOrder(row),
          }));
          const localOrders = (S.orders || []).filter((order: any) => !order?.backendId);
          S.orders = [...serverOrders, ...localOrders].sort((a: any, b: any) => Number(b.t0 || 0) - Number(a.t0 || 0));
          changed = true;
        }

        if (changed) {
          save();
          emit();
        }
      } while (refreshAgain && !stopped);
    } finally {
      refreshing = false;
    }
  };

  const applyUser = (nextUserId: string | null) => {
    if (stopped) return;
    if (nextUserId === userId) {
      if (nextUserId) void refresh();
      return;
    }
    generation++;
    userId = nextUserId;
    clearChannel();
    if (poll) {
      clearInterval(poll);
      poll = null;
    }
    clearAccountState();
    if (!userId) return;

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
    if (stopped || error || initialEpoch !== authEpoch) return;
    applyUser(data.session?.user?.id || null);
  }).catch(() => {});

  appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active') void refresh();
  });

  return () => {
    if (stopped) return;
    stopped = true;
    generation++;
    userId = null;
    if (authTimer) clearTimeout(authTimer);
    if (poll) clearInterval(poll);
    clearChannel();
    authListener.subscription.unsubscribe();
    appStateSub?.remove();
  };
}
