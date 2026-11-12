/* Goodies state, persistence, pricing and cart logic. */
import {useSyncExternalStore} from 'react';
import {previewStorage as AsyncStorage} from './previewRuntime';
import {previewBackend as supabase} from './previewRuntime';
import {providerInfo} from './providers';
import {label} from './content';
import type {Store, Item, Address, CartLine, Order} from './data/types';
import {STAGES_DELIVERY, STAGES_PICKUP} from './data/seed';
import {friendlyError} from './friendlyError';
export let previewOnly = false;
export const setPreviewOnly=(value:boolean)=>{previewOnly=value;};
export let editLocked=false;
export const setEditLocked=(value:boolean)=>{editLocked=value;};
export const KEY = 'goodies-live-v4';
export const WKEY = 'goodies-live-profile-v2';

/* The customer catalog is empty until published backend products are available. */
export const IT: Record<string, Item> = {};
export const STB: Record<string, Store> = {};
export const ST: Store[] = [];
export const PV: Record<string, boolean> = {};
export const PR: any[] = [];
export const contentHooks: {coupons?: () => any[]; fees?: () => any; minAge?: (cc: string) => number} = {};
const coupons = () => (contentHooks.coupons ? contentHooks.coupons() : []);
const feesNow = () => (contentHooks.fees ? contentHooks.fees() : {svc: 0, firstFree: false, far: 0, tips: [], lead: 0, step: 0, slots: 0, pay: {Wallet: 0, MonCash: 0, Card: 0, Cash: 0}, rfSvc: false, rfTip: false});
export const DEALS: any[] = [];

/* ---------- helpers ---------- */
const LOC: Record<string, string> = {en: 'en-US', fr: 'fr-FR', ht: 'fr-HT', es: 'es-ES', 'zh-Hans': 'zh-Hans-CN'};
/* Language only changes the number format. The currency stays USD until the Admin Display currency setting is wired in. */
export const money = (n: number) => {
  try {return new Intl.NumberFormat(LOC[S.lang] || 'en-US', {style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol'}).format(n);} catch (e) {return '$' + n.toFixed(2);}
};
export const fmtTime = (d: Date) => {
  try {return new Intl.DateTimeFormat(LOC[S.lang] || 'en-US', {hour: 'numeric', minute: '2-digit'}).format(d);} catch (e) {let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, '0'); return (h % 12 || 12) + ':' + m + ' ' + (h >= 12 ? 'PM' : 'AM');}
};
export const fmtDay = (d: Date) => {
  try {return new Intl.DateTimeFormat(LOC[S.lang] || 'en-US', {month: 'short', day: 'numeric'}).format(d);} catch (e) {return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] + ' ' + d.getDate();}
};
export const fmtStoreDay = (_sid: string, timestamp: number) => new Intl.DateTimeFormat(LOC[S.lang] || 'en-US', {timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, month: 'short', day: 'numeric'}).format(new Date(timestamp));
export const fmtStoreTime = (_sid: string, timestamp: number) => new Intl.DateTimeFormat(LOC[S.lang] || 'en-US', {timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, hour: 'numeric', minute: '2-digit', timeZoneName: 'short'}).format(new Date(timestamp));
export const dp = (i: Item, off: number) => Math.round(i.p * (100 - off)) / 100;
export const cname = (id: string, cats: {id: string; name: any}[]) => (cats.find(c => c.id === id) as any)?.name || 'All stores';
const zoneOf = (t: string) => {let x = 0; for (let i = 0; i < t.length; i++) x = (x * 31 + t.charCodeAt(i)) % 97; return Math.round((x % 5) * 9) / 10;};
export const phoneOK = (s: string) => {s = String(s || '').trim(); const d = s.replace(/\D/g, ''); return /^[+\d][\d\s().-]*$/.test(s) && d.length >= 8 && d.length <= 15;};

/* ---------- state ---------- */
const WDEF = () => ({
  pf: {n: '', e: '', ph: '', av: ''},
  addr: [] as Address[],
});
const GDEF = () => ({
  firstOrderEligible: null as boolean | null,
  serverUnread: 0, checkoutAttempt: null as any,
  goodiesAccess: {status: 'active', reason: '', endsAt: null as string | null},
  notifs: [] as any[],
  orders: [] as Order[], cart: {sid: null as string | null, lines: [] as CartLine[]}, fav: [] as string[], favp: [] as string[], cards: [] as any[],
  wallet: 0, hasWallet: false, pay: 'wallet', selectedCardId: '', mode: 'delivery', tip: 0, promo: '', as: 0, gc: [] as any[], cc: 'w', np: {orders: 0, promos: 0}, rev: {} as any, driverRev: {} as any, rec: [] as any[], rv: [] as any[], groupOrder: null as any,
});
export const WP = ['pf', 'addr'], GP = ['notifs', 'orders', 'cart', 'fav', 'favp', 'pay', 'mode', 'tip', 'promo', 'as', 'gc', 'cc', 'np', 'rev', 'driverRev', 'rec', 'rv', 'groupOrder'];

export interface Route {r: string; p?: any; u: number; sy?: number}
export const S: any = Object.assign(WDEF(), GDEF());
let uid = 0;
S.stack = [{r: 'home', u: ++uid}] as Route[];
Object.assign(S, {f: '', sub: '', ot: 'active', ft: 'stores', sh: null, pend: null, bump: 0, cs: 0, time: 'ASAP', sch: 0, note: '', pin: '', busy: 0, ss: {}, srt: 'rel', sr: {q: '', sort: 'rel', f: {}}, theme: 'light', lang: 'en', ready: false});

/* ---------- subscription ---------- */
const subs = new Set<() => void>();
let ver = 0;
export const emit = () => {ver++; subs.forEach(f => f());};
export function useGoodies() {return useSyncExternalStore(cb => {subs.add(cb); return () => {subs.delete(cb);};}, () => ver);}

/* ---------- ui bridge (toast / sheet) ---------- */
export const ui: {toast: (t: string) => void; sheet: (h: any) => void; close: () => void} = {toast: () => {}, sheet: () => {}, close: () => {}};
export const toast = (t: string) => ui.toast(t);

function formatHour(d: Date) {
  let h = d.getHours(), m = String(d.getMinutes()).padStart(2, '0');
  return (h % 12 || 12) + (m === '00' ? '' : ':' + m) + (h >= 12 ? 'pm' : 'am');
}

/* ---------- live catalog (stores + products from the backend) ---------- */
const CAT_EMOJI: Record<string, string> = {restaurants: '🍽️', produce: '🥭', beverages: '🥤', bakery: '🥐', meat: '🥩', groceries: '🛒', haitian: '🇭🇹', care: '🧴', drugstore: '💊'};
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
type DayHours = {open: string; close: string; closed: boolean};
const hm = (v: any): number | null => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(v || ''));
  if (!m) return null;
  const h = +m[1], mi = +m[2];
  return h > 23 || mi > 59 ? null : h * 60 + mi;
};
const fmtHM = (min: number) => {const d = new Date(); d.setHours(Math.floor(min / 60) % 24, min % 60, 0, 0); return formatHour(d);};
const bgOf = (id: string) => 'bg' + Array.from(id).reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 5, 0);

/* Opening hours use the store's configured timezone, matching server checkout validation. */
export function openState(hours: Record<string, DayHours> | null | undefined, now: Date = new Date(), timezone = 'UTC'): {open: number; h: string; nx: string} {
  if (!hours || typeof hours !== 'object' || !Object.keys(hours).length) return {open: 0, h: '', nx: label('lbl.storeHoursNotSet', 'Opening hours not set')};
  let today = -1, nowMin = 0;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {timeZone: timezone || 'UTC', weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(now);
    today = DAY_NAMES.indexOf(parts.find(p => p.type === 'weekday')?.value || '');
    nowMin = Number(parts.find(p => p.type === 'hour')?.value) * 60 + Number(parts.find(p => p.type === 'minute')?.value);
  } catch {
    return {open: 0, h: '', nx: label('lbl.storeHoursUnavailable', 'Opening hours unavailable')};
  }
  if (today < 0 || !Number.isFinite(nowMin)) return {open: 0, h: '', nx: label('lbl.storeHoursUnavailable', 'Opening hours unavailable')};
  const win = (day: number) => {
    const d: any = (hours as any)[DAY_NAMES[((day % 7) + 7) % 7]];
    if (!d || d.closed) return null;
    const o = hm(d.open), c = hm(d.close);
    return o == null || c == null ? null : {o, c};
  };
  const tw = win(today), yw = win(today - 1);
  let open = 0, closesAt = 0;
  if (tw) {
    if (tw.c > tw.o) {if (nowMin >= tw.o && nowMin < tw.c) {open = 1; closesAt = tw.c;}}
    else if (nowMin >= tw.o) {open = 1; closesAt = tw.c;} /* closes after midnight */
  }
  if (!open && yw && yw.c <= yw.o && nowMin < yw.c) {open = 1; closesAt = yw.c;}
  const h = tw ? fmtHM(tw.o) + '–' + fmtHM(tw.c) : label('lbl.storeClosedToday', 'Closed today');
  if (open) return {open, h, nx: label('lbl.storeOpenUntil', 'Open until {time}').replace('{time}', fmtHM(closesAt))};
  for (let off = 0; off <= 7; off++) {
    const w = win(today + off);
    if (!w || (off === 0 && nowMin >= w.o)) continue;
    const nx = off === 0 ? label('lbl.storeOpensToday', 'Opens {time} today') : off === 1 ? label('lbl.storeOpensTomorrow', 'Opens {time} tomorrow') : label('lbl.storeOpensOnDay', 'Opens {time} {day}').replace('{day}', DAY_NAMES[(today + off) % 7]);
    return {open: 0, h, nx: nx.replace('{time}', fmtHM(w.o))};
  }
  return {open: 0, h, nx: label('lbl.storeCurrentlyClosed', 'Currently closed')};
}

function liveStore(r: any, items: Item[]): Store {
  const id = String(r.store_id || r.business_id), names = r.names && typeof r.names === 'object' ? r.names : {};
  const eMin = Number(r.eta_min) || 20, eMax = Number(r.eta_max) || 35, st = openState(r.hours, new Date(), String(r.scheduled_order_timezone || 'UTC'));
  const store: Store = {
    id, businessId: String(r.business_id), c: r.category || 'groceries', e: CAT_EMOJI[r.category] || '🛍️', bg: bgOf(id), r: 0, rv: 0, km: 0, km0: 0,
    eta: eMin + '–' + eMax, eta0: eMin + '–' + eMax, fee: Number(r.delivery_fee) || 0, min: Number(r.min_order) || 0,
    pr: r.promo || '', k: r.kind || '', it: items, open: st.open, h: st.h, nx: st.nx, far: false, live: true,
    logo: r.logo_url || null, cover: r.cover_url || null, thumbnail: r.thumbnail_url || null, storeLatitude: r.store_latitude == null ? null : Number(r.store_latitude), storeLongitude: r.store_longitude == null ? null : Number(r.store_longitude), acceptScheduledOrders: !!r.accept_scheduled_orders,
    scheduledOrderStartTime: String(r.scheduled_order_start_time || '10:00').slice(0,5), scheduledOrderTimezone: String(r.scheduled_order_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone), scheduleHours: r.hours || undefined,
    businessName: r.store_name || '', businessDescription: r.description || '', businessPhone: r.phone || '', businessEmail: r.email || '', businessWebsite: r.website || '',
    businessAddress: r.address || '', businessCity: r.city || '', businessCountry: r.country || '', businessDeliveryModes: Array.isArray(r.delivery_modes) ? r.delivery_modes : [], businessLogoUrl: r.logo_url || '', acceptCashOnDelivery: !!r.accept_cash_on_delivery, deliveryPricingMode: r.delivery_pricing_mode === 'distance' ? 'distance' : 'fixed', maxDeliveryDistanceKm: r.delivery_max_distance_km == null ? null : Number(r.delivery_max_distance_km), distanceReady: false, distanceAddressKey: '', distanceError: '',
    get n() {const t = names[S.lang]; return (typeof t === 'string' && t.trim()) || r.store_name || 'Store';},
  } as Store;
  return store;
}

function placeholderStore(sid: string, _name: string): Store {
  return {
    id: sid, n: 'Store', c: '', e: '🛍️', bg: bgOf(sid), r: 0, rv: 0, km: 0, km0: 0, eta: '0–0', eta0: '0–0', fee: 0, min: 0, pr: '', k: '', it: [],
    open: 0, h: '', nx: 'No longer taking orders', far: false, acceptScheduledOrders: false,
  };
}

let liveTimer: any = null;
export async function refreshLiveSchedules() {
  if(previewOnly)return;
  try {
    const {data: rows, error} = await supabase.from('goodies_store_schedules')
      .select('business_id,store_id,description,phone,email,website,address,city,country,store_latitude,store_longitude,delivery_modes,logo_url,thumbnail_url,store_name,hours,accept_scheduled_orders,scheduled_order_start_time,scheduled_order_timezone,category,kind,min_order,delivery_fee,delivery_pricing_mode,delivery_max_distance_km,accept_cash_on_delivery,eta_min,eta_max,promo,names,cover_url')
      .eq('is_live', true);
    if (error) throw error;
    const stores: any[] = rows || [], prods: any[] = [];
    if (stores.length) {
      const ids = stores.map(r => r.business_id);
      for (let from = 0; ; from += 1000) {
        const pr = await supabase.from('goodies_products')
          .select('id,business_id,name,description,price,emoji,stock,restriction,photo_url,photo_urls,sort_order,created_at')
          .in('business_id', ids).eq('is_available', true).eq('review_status', 'approved')
          .order('sort_order', {ascending: true}).order('created_at', {ascending: true}).order('id', {ascending: true})
          .range(from, from + 999);
        if (pr.error) throw pr.error;
        prods.push(...(pr.data || []));
        if ((pr.data || []).length < 1000) break;
      }
    }
    const ratingByBiz: Record<string, {sum: number; count: number}> = {};
    if (prods.length) {
      const productBusiness = new Map(prods.map(p => [String(p.id), String(p.business_id)]));
      try {
        for (let from = 0; ; from += 1000) {
          const rr = await supabase.from('reviews').select('product_id,rating')
            .in('product_id', prods.map(p => p.id)).gte('rating', 1).lte('rating', 5)
            .range(from, from + 999);
          if (rr.error) break;
          for (const review of rr.data || []) {
            const businessId = productBusiness.get(String(review.product_id));
            if (!businessId) continue;
            const acc = ratingByBiz[businessId] || (ratingByBiz[businessId] = {sum: 0, count: 0});
            acc.sum += Number(review.rating); acc.count += 1;
          }
          if ((rr.data || []).length < 1000) break;
        }
      } catch (e) {}
    }
    Object.keys(IT).forEach(k => delete IT[k]); Object.keys(STB).forEach(k => delete STB[k]); ST.length = 0;
    const byBiz: Record<string, Item[]> = {};
    stores.forEach(r => {byBiz[r.business_id] = [];});
    prods.forEach(p => {
      const r = stores.find(x => x.business_id === p.business_id); if (!r) return;
      const stock = Math.max(0, Math.floor(Number(p.stock) || 0));
      const it: Item = {id: p.id, s: String(r.store_id || r.business_id), n: p.name, p: Number(p.price) || 0, e: p.emoji || '🛍️', stock, oos: stock < 1 ? 1 : 0, d: p.description || '', al: '', w: false, restriction: p.restriction || null, photo: p.photo_urls?.[0] || p.photo_url || null, photos: (Array.isArray(p.photo_urls) && p.photo_urls.length ? p.photo_urls : (p.photo_url ? [p.photo_url] : [])).slice(0,5)};
      IT[p.id] = it; byBiz[r.business_id].push(it);
    });
    S.cart?.lines?.forEach((line: CartLine) => {
      const current = IT[line.id];
      if (current?.photo) line.photo = current.photo;
    });
    stores.forEach(r => {const s = liveStore(r, byBiz[r.business_id] || []); const rating = ratingByBiz[String(r.business_id)]; if (rating?.count) { s.r = Math.round((rating.sum / rating.count) * 10) / 10; s.rv = rating.count; } STB[s.id] = s; ST.push(s);});
    (S.orders || []).forEach((o: any) => {if (o && o.sid && !STB[o.sid]) STB[o.sid] = placeholderStore(o.sid, o.sn); if (o && Array.isArray(o.lines)) o.lines = o.lines.map((line: any) => ({...line, photo: line.photo || IT[String(line.id || '')]?.photo || null}));});
    if (S.cart && S.cart.sid && !STB[S.cart.sid]) STB[S.cart.sid] = placeholderStore(S.cart.sid, '');
    S.catalogError = '';
    applyZone();
  } catch (e: any) {
    S.catalogError = friendlyError(e, label("lbl.cms.ce62eda09faa", "Could not load stores"));
  }
  if (!liveTimer) {
    liveTimer = setInterval(() => {
      let ch = false;
      ST.forEach(s => {
        if (!s.live) return;
        const o = openState(s.scheduleHours, new Date(), s.scheduledOrderTimezone || 'UTC');
        if (o.open !== s.open || o.nx !== s.nx || o.h !== s.h) {s.open = o.open; s.nx = o.nx; s.h = o.h; ch = true;}
      });
      if (ch) emit();
    }, 60000);
  }
  emit();
}

/* ---------- persistence ---------- */
export async function refreshGoodiesAccess() {
  if (providerInfo.demo) {
    S.goodiesAccess = {status: 'active', reason: '', endsAt: null};
    emit();
    return S.goodiesAccess;
  }
  const {data, error} = await supabase.rpc('get_my_goodies_access_status');
  if (error) {
    S.goodiesAccess = {status: 'unknown', reason: '', endsAt: null};
    emit();
    return S.goodiesAccess;
  }
  const row = Array.isArray(data) ? data[0] : data;
  S.goodiesAccess = {
    status: row?.status === 'suspended' || row?.status === 'banned' ? row.status : 'active',
    reason: String(row?.reason || ''),
    endsAt: row?.ends_at || null,
  };
  emit();
  return S.goodiesAccess;
}

export async function refreshUserAddresses() {
  if (providerInfo.demo) return S.addr;
  const {data: auth, error: authError} = await supabase.auth.getUser();
  if (authError || !auth.user) return S.addr;
  const baseColumns = 'id,recipient_name,phone_number,country,department,city,street_address,apartment,delivery_notes,is_default,created_at';
  const read = (columns: string) => supabase.from('user_addresses').select(columns)
    .eq('user_id', auth.user.id).order('is_default', {ascending: false}).order('created_at', {ascending: true});
  /* Coordinates need the latitude/longitude columns; fall back cleanly until the migration is applied. */
  let {data, error} = await read(baseColumns + ',latitude,longitude');
  if (error && /latitude|longitude/i.test(String(error.message))) ({data, error} = await read(baseColumns));
  if (error) throw error;
  const metadataAddressId = String(auth.user.user_metadata?.goodies_default_address_id || '');
  const rows = (data || []).map((row: any) => ({
    id: String(row.id), l: String(row.recipient_name || 'Home'),
    t: [row.street_address, row.city, row.department, row.country].filter(Boolean).join(', '),
    apt: String(row.apartment || ''), inst: String(row.delivery_notes || ''),
    def: row.is_default ? 1 : 0, goodiesDefault: String(row.id) === metadataAddressId ? 1 : 0,
    z: 0, cc: row.country === 'Dominican Republic' ? 'DO' : row.country === 'United States' ? 'US' : row.country === 'Haiti' ? 'HT' : 'XX',
    city: String(row.city || ''), department: String(row.department || ''), country: String(row.country || ''),
    phone: String(row.phone_number || ''), createdAt: row.created_at,
    latitude: row.latitude == null ? null : Number(row.latitude), longitude: row.longitude == null ? null : Number(row.longitude),
  }));
  S.addr = rows;
  const selected = rows.find((row: any) => row.id === metadataAddressId) || rows.find((row: any) => row.def) || rows[0];
  S.as = selected?.id ?? 0;
  if (selected && selected.id !== metadataAddressId) {
    void supabase.auth.updateUser({data: {goodies_default_address_id: selected.id}});
  }
  applyZone(); emit();
  return S.addr;
}

export async function load() {
  if(previewOnly)return;
  const merge = async (key: string, D: any) => {
    try {
      const raw = JSON.parse((await AsyncStorage.getItem(key)) || 'null');
      if (raw && typeof raw === 'object') for (const k in D) if (raw[k] !== undefined && typeof raw[k] === typeof D[k] && Array.isArray(raw[k]) === Array.isArray(D[k])) S[k] = raw[k];
    } catch (e) {}
  };
  await merge(WKEY, WDEF()); await merge(KEY, GDEF());
  try {
    const attempt = JSON.parse((await AsyncStorage.getItem('goodies-checkout-attempt-v1')) || 'null');
    if (attempt && typeof attempt.key === 'string' && typeof attempt.fingerprint === 'string') S.checkoutAttempt = attempt;
  } catch (e) {}
  S.wallet = 0; S.hasWallet = false; S.cards = []; S.selectedCardId = '';
  try {
    const {data: auth} = await supabase.auth.getUser();
    if (auth.user) {
      const {data: profile} = await supabase.from('profiles').select('full_name,email,phone_number,avatar_url').eq('id', auth.user.id).maybeSingle();
      if (profile) S.pf = {n: profile.full_name || '', e: profile.email || auth.user.email || '', ph: profile.phone_number || '', av: profile.avatar_url || ''};
      await refreshUserAddresses();
    }
  } catch (e) {}
  if (!providerInfo.demo) {
    try {
      const {data: sessionData} = await supabase.auth.getUser();
      const userId = sessionData.user?.id;
      await refreshGoodiesAccess();
      if (userId) {
        const [walletResult, methodsResult] = await Promise.all([
          supabase.from('wallets').select('balance').eq('user_id', userId).maybeSingle(),
          supabase.rpc('get_my_payment_methods'),
        ]);
        if (!walletResult.error) {
          S.hasWallet = !!walletResult.data;
          S.wallet = Number(walletResult.data?.balance ?? 0);
        }
        if (!methodsResult.error && Array.isArray(methodsResult.data)) {
          S.cards = methodsResult.data.map((pm: any) => ({
            id: String(pm.id), b: String(pm.brand || 'Card'), l4: String(pm.last4 || ''),
            expiryMonth: pm.expiry_month, expiryYear: pm.expiry_year, isDefault: !!pm.is_default,
          }));
        }
      }
    } catch (e) {
      // Keep cached state visible if the wallet/card service is temporarily unavailable.
    }
  }
  try {const t = await AsyncStorage.getItem('goodies-theme'); if (t === 'light' || t === 'dark') S.theme = t;} catch (e) {}
  try {const l = await AsyncStorage.getItem('goodies-lang'); if (l) S.lang = l;} catch (e) {}
  /* The catalog must be loaded before the cart, favorites and orders are checked against it. */
  await refreshLiveSchedules();
  /* sanitise exactly like v24 */
  const c = S.cart;
  if (!c || !Array.isArray(c.lines)) S.cart = {sid: null, lines: []};
  S.cart.lines = S.cart.lines.filter((l: any) => l && ((l.byo && l.byo.bid && l.byo.sel && l.byo.lines) || IT[l.id]) && l.q > 0);
  if (!S.cart.lines.length) S.cart.sid = null;
  else if (!cartStoreIds().includes(String(S.cart.sid))) S.cart.sid = cartStoreIds()[0] || null;
  if (S.checkoutAttempt && !S.cart.lines.length && !S.checkoutAttempt.completed) {
    S.checkoutAttempt = {...S.checkoutAttempt, completed: true};
    try {await AsyncStorage.setItem('goodies-checkout-attempt-v1', JSON.stringify(S.checkoutAttempt));} catch (e) {}
  }
  S.orders = S.orders.filter((o: any) => o && STB[o.sid] && Array.isArray(o.lines));
  S.fav = S.fav.filter((x: string) => STB[x]); S.favp = S.favp.filter((x: string) => IT[x]);
  S.addr = S.addr.filter((a: any) => a && a.t); if (!S.addr.length && providerInfo.demo) S.addr = WDEF().addr;
  S.addr.forEach((a: any) => {if (typeof a.z !== 'number') a.z = zoneOf(a.t); if (!a.cc) a.cc = 'HT';});
  if (S.addr.length && !S.addr.some((a: Address) => a.def) && providerInfo.demo) S.addr[0].def = 1;
  if (!S.pf || !S.pf.n) S.pf = WDEF().pf; if (!S.pf.ph) S.pf.ph = WDEF().pf.ph;
  S.gc = S.gc.filter((c: any) => c && c.id && c.ph);
  if (S.cc !== 'w' && !S.gc.some((c: any) => c.id === S.cc)) S.cc = 'w';
  if (!S.addr.some((a: Address) => a.id === S.as)) S.as = defAddr()?.id ?? 0;
  applyZone(); S.ready = true; emit();
}
export function save(): Promise<void> {
  try {
    const w: any = {}, g: any = {};
    WP.forEach(k => (w[k] = S[k])); GP.forEach(k => (g[k] = S[k]));
    return Promise.all([
      AsyncStorage.setItem(WKEY, JSON.stringify(w)),
      AsyncStorage.setItem(KEY, JSON.stringify(g)),
    ]).then(() => undefined).catch(() => undefined);
  } catch (e) {
    return Promise.resolve();
  }
}

export async function getGoodiesCheckoutAttempt(fingerprint: string): Promise<{key: string; fingerprint: string}> {
  const current = S.checkoutAttempt;
  if (current && !current.completed && current.fingerprint === fingerprint && typeof current.key === 'string') {
    return {key: current.key, fingerprint: current.fingerprint};
  }
  const attempt = {
    key: 'goodies-checkout-' + Date.now() + '-' + Math.random().toString(36).slice(2),
    fingerprint,
    completed: false,
  };
  S.checkoutAttempt = attempt;
  await AsyncStorage.setItem('goodies-checkout-attempt-v1', JSON.stringify(attempt));
  return {key: attempt.key, fingerprint: attempt.fingerprint};
}

export async function completeGoodiesCheckoutAttempt(orderId: string): Promise<void> {
  if (!S.checkoutAttempt || !orderId) return;
  S.checkoutAttempt = {...S.checkoutAttempt, completed: true, orderId};
  try {await AsyncStorage.setItem('goodies-checkout-attempt-v1', JSON.stringify(S.checkoutAttempt));} catch (e) {}
}
export const setTheme = (t: 'light' | 'dark') => {S.theme = t; AsyncStorage.setItem('goodies-theme', t); emit();};
export const setLang = (l: string) => {S.lang = l; AsyncStorage.setItem('goodies-lang', l); emit();};

/* ---------- derived ---------- */
export const defAddr = (): Address => S.addr.filter((a: Address) => a.def)[0] || S.addr[0];
export const addr = (): Address => S.addr.filter((a: Address) => a.id === S.as)[0] || defAddr();
export const cur = (): Route => S.stack[S.stack.length - 1];
export const cnt = () => S.cart.lines.reduce((a: number, l: CartLine) => a + l.q, 0);
export const unread = () => Number(S.serverUnread || 0) > 0 || S.notifs.some((n: any) => n.u);
export const first = () => S.firstOrderEligible === true && S.orders.length === 0;
export const isPk = () => S.mode === 'pickup' || !!(S.cart.sid && STB[S.cart.sid]?.far);
/** Exact coordinates saved with the address (captured with "Use my current location"); more precise than geocoding the text. */
export const savedPoint = (address: any): [number, number] | null => {const la = Number(address?.latitude), lo = Number(address?.longitude); return address?.latitude != null && address?.longitude != null && Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180 ? [la, lo] : null;};
const distanceAddressKey = (address: Address) => JSON.stringify({
  t: address.t, apt: address.apt, inst: address.inst,
  city: address.city, department: address.department, country: address.country,
  location: savedPoint(address) || (S.currentLocation && S.currentLocation.addressText === address.t && Date.now() - Number(S.currentLocation.capturedAt || 0) < 30 * 60 * 1000 ? [S.currentLocation.latitude, S.currentLocation.longitude] : null),
});
const currentDistanceAddressKey = () => {
  const current = addr();
  return current ? distanceAddressKey(current) : '';
};
export async function refreshStoreDistances(storeIds: string[], address: Address | null = addr()) {
  if(previewOnly)return {};
  if (!address?.t?.trim()) return {};
  const addressKey = distanceAddressKey(address);
  const pending = [...new Set(storeIds)].map(id => STB[id]).filter(store =>
    store?.live && (!store.distanceReady || store.distanceAddressKey !== addressKey));
  if (!pending.length) return Object.fromEntries(storeIds.map(id => [id, STB[id]?.km ?? null]));
  pending.forEach(store => { store.distanceError = ''; });
  const pinned = savedPoint(address);
  const location = pinned ? {latitude: pinned[0], longitude: pinned[1]} : S.currentLocation && S.currentLocation.addressText === address.t && Date.now() - Number(S.currentLocation.capturedAt || 0) < 30 * 60 * 1000 ? S.currentLocation : null;
  const payloadAddress = {
    t: address.t, apt: address.apt, inst: address.inst,
    city: address.city, department: address.department, country: address.country,
    ...(location ? {latitude: location.latitude, longitude: location.longitude} : {}),
  };
  const distances: Record<string, number | null> = {};
  for (let offset = 0; offset < pending.length; offset += 8) {
    const batch = pending.slice(offset, offset + 8);
    const {data, error} = await supabase.functions.invoke('goodies-delivery-quote', {
      body: {store_ids: batch.map(store => store.id), address: payloadAddress, distance_only: true},
    });
    if (currentDistanceAddressKey() !== addressKey) return distances;
    if (error) {
      batch.forEach(store => { store.distanceError = friendlyError(error, label("lbl.cms.5abb6f216652", "Distance is unavailable for this address.")); });
      emit();
      throw error;
    }
    const rows = Array.isArray(data?.stores) ? data.stores : [];
    const byId = new Map(rows.map((row: any) => [String(row.store_id), row]));
    batch.forEach(store => {
      const row: any = byId.get(store.id);
      const meters = row?.distance_m == null ? NaN : Number(row.distance_m);
      if (!Number.isFinite(meters) || meters < 0) {
        store.distanceError = row?.error || 'Distance is unavailable for this address.';
        distances[store.id] = null;
        return;
      }
      const gps = location && store.storeLatitude != null && store.storeLongitude != null && Number.isFinite(Number(store.storeLatitude)) && Number.isFinite(Number(store.storeLongitude)) ? location : null;
      if (gps) {
        const rad = (degrees: number) => degrees * Math.PI / 180;
        const dLat = rad(Number(store.storeLatitude) - Number(gps.latitude));
        const dLon = rad(Number(store.storeLongitude) - Number(gps.longitude));
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(Number(gps.latitude))) * Math.cos(rad(Number(store.storeLatitude))) * Math.sin(dLon / 2) ** 2;
        store.km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      } else store.km = meters / 1000;
      store.far = row.outside_delivery_area === true ||
        (store.maxDeliveryDistanceKm != null && store.km > store.maxDeliveryDistanceKm);
      store.distanceReady = true;
      store.distanceError = '';
      store.distanceAddressKey = addressKey;
      distances[store.id] = store.km;
    });
    emit();
  }
  return distances;
}
export async function refreshStoreDistance(storeId: string, address: Address | null = addr()) {
  if(previewOnly)return {};
  const result = await refreshStoreDistances([storeId], address);
  return result[storeId] ?? null;
}
export function applyZone() {
  const z = addr()?.z || 0, d = Math.round(z * 3);
  ST.forEach(s => {
    /* Live stores have no geo data yet, so no invented distance or ETA padding. */
    if (s.live) {const a = addr(); const key = a ? JSON.stringify({t:a.t,apt:a.apt,inst:a.inst,city:a.city,department:a.department,country:a.country}) : ''; if (s.distanceAddressKey !== key) {s.km = 0; s.distanceReady = false; s.distanceError = ''; s.distanceAddressKey = key;} s.eta = s.eta0; s.far = false; return;}
    s.km = Math.round((s.km0 + z) * 10) / 10;
    const q = s.eta0.split('–');
    s.eta = (+q[0] + d) + '–' + (+q[1] + d);
    s.far = s.km > feesNow().far;
  });
}
export function ctOf() {
  if (S.cc !== 'w') {const c = S.gc.filter((x: any) => x.id === S.cc)[0]; if (c) return {id: c.id, ph: c.ph, l: c.l || label('lbl.sheetGoodiesNumber', 'Goodies number'), w: 0};}
  return {id: 'w', ph: S.pf.ph, l: label('lbl.sheetDefaultNumber', 'Default Wantiss number'), w: 1};
}
export const done = (o: Order) => o.cx || ['declined', 'expired', 'cancelled'].includes(String((o as any).serverStatus || '').toLowerCase()) || (o.st as number) >= (o.pk ? 4 : 6);
export const TL = STAGES_DELIVERY, TP = STAGES_PICKUP;
export function stage(o: Order) {
  if (!o.backendId) return 0;
  const map: Record<string, number> = {scheduled: 0, placed: 0, accepted: 1, preparing: 2, ready: 3, courier_assigned: 4, picked_up: 5, completed: o.pk ? 4 : 6, cancelled: 0, declined: 0, expired: 0};
  return map[String(o.serverStatus || 'scheduled').toLowerCase()] ?? 0;
}
export function notify(t: string, d: string, r: string, p: string, k?: string) {
  if (k === 'o' && !S.np.orders) return;
  if (k === 'p' && !S.np.promos) return;
  S.notifs.unshift({id: Date.now() + Math.random(), t, d, r, p, u: 1});
}

/* ---------- pricing ---------- */
export function pChk(code: string, sub: number, sid: string | null) {
  const p = coupons().filter((x: any) => x.c === code)[0];
  if (!p) return {e: label('lbl.cartPromoInvalid', 'That code is not valid')} as any;
  if (p.st && sid && p.st !== sid) return {e: label('lbl.cartPromoStoreOnly', 'Only valid at {store}').replace('{store}', STB[p.st].n)} as any;
  if (sub < p.min) return {e: label('lbl.cartPromoMinimum', 'Spend {amount} more to use {code}').replace('{amount}', money(p.min - sub)).replace('{code}', code)} as any;
  return {p} as any;
}
/** The store a cart line belongs to. Older saved lines fall back to the product's store. */
export const lineStore = (l: CartLine): string => l.s || IT[l.id]?.s || S.cart.sid || '';
/** Stores in the cart, in the order they were added. */
export const cartStoreIds = (): string[] => {
  const ids = S.cart.lines.map(lineStore).filter((id: string): id is string => typeof id === 'string' && id.length > 0);
  return Array.from(new Set<string>(ids));
};
/** How many stores one order may include (set in tiss-admin). */
export const maxStops = (): number => Math.max(1, Math.min(8, Number((feesNow() as any).maxStops) || 3));
/** Cart subtotal for one store. */
export const storeSub = (storeId: string): number => S.cart.lines.filter((l: CartLine) => lineStore(l) === storeId).reduce((a: number, l: CartLine) => a + l.p * l.q, 0);
export const canAddStop = (storeId: string): boolean => {
  const ids = cartStoreIds();
  if (!ids.length || ids.includes(storeId)) return true;
  const target = STB[storeId];
  return ids.length < maxStops() && S.mode !== 'pickup' && !!target?.live && !target?.far && ids.every(id => STB[id]?.live && !STB[id]?.far) && !hasAlcohol();
};
export function totals() {
  const st = S.cart.sid ? STB[S.cart.sid] : null;
  const sub = S.cart.lines.reduce((a: number, l: CartLine) => a + l.p * l.q, 0), pk = isPk();
  const pc: any = S.promo && sub ? pChk(S.promo, sub, S.cart.sid) : {}, p = pc.p, ship = p && p.ty === 'ship';
  const F = feesNow();
  const selectedAddress = addr();
  const quote = (S as any).deliveryFeeQuote;
  const quoteAddressKey = selectedAddress ? JSON.stringify({l: selectedAddress.l, t: selectedAddress.t, apt: selectedAddress.apt, inst: selectedAddress.inst, city: selectedAddress.city, department: selectedAddress.department, country: selectedAddress.country}) : '';
  const quoteValid = !!st && st.deliveryPricingMode === 'distance' && quote?.storeId === st.id && quote?.addressKey === quoteAddressKey && Number(quote?.expiresAt) > Date.now();
  const stops = cartStoreIds();
  if (stops.length > 1) {
    /* Several stores: one combined delivery fee (the extra-store surcharge is added on the server and not itemised), one service fee, no promo code. */
    const mq = (S as any).deliveryFeeQuote;
    const mqValid = !!mq?.multi && mq.storeKey === stops.join(',') && String(mq.addressId) === String(S.as) && Number(mq.expiresAt) > Date.now();
    const mFee = pk ? 0 : first() && F.firstFree ? 0 : mqValid ? Number(mq.fee) : stops.reduce((a: number, id: string) => a + (Number(STB[id]?.fee) || 0), 0);
    const mSvc = sub ? F.svc : 0, mTip = pk ? 0 : S.tip;
    return {st, sub, fee: mFee, svc: mSvc, disc: 0, tip: mTip, total: sub + mFee + mSvc + mTip, free: false, perr: '', pok: false, stops};
  }
  const fee = !st || pk ? 0 : (first() && F.firstFree) || ship ? 0 : quoteValid ? Number(quote.fee) : st.fee === 0 ? 0 : st.fee, svc = sub ? F.svc : 0;
  const disc = p && p.ty === 'pct' ? Math.round(sub * p.v) / 100 : 0, tip = pk ? 0 : S.tip;
  return {st, sub, fee, svc, disc, tip, total: sub + fee + svc - disc + tip, free: !!st && !pk && st.fee > 0 && fee === 0, perr: S.promo && sub && pc.e ? pc.e : '', pok: !!p, stops};
}
export const qtyIn = (id: string) => S.cart.lines.filter((l: CartLine) => l.id === id).reduce((a: number, l: CartLine) => a + l.q, 0);
export function canBuy(i: Item) {
  const s = STB[i.s];
  if (!s.open && !s.acceptScheduledOrders) {toast(label('lbl.actionStoreClosedNext', '{store} is closed. {next}').replace('{store}', s.n).replace('{next}', s.nx)); return false;}
  if (i.oos) {toast(label('lbl.actionOutOfStock', 'Sorry, {item} is out of stock').replace('{item}', i.n)); return false;}
  return true;
}

/* ---------- navigation (internal stack, same semantics as v24) ---------- */
export function push(r: string, p?: any) {ui.close(); S.stack.push({r, p, u: ++uid}); emit();}
export function reset(r: string) {ui.close(); S.stack = [{r, u: ++uid}]; emit();}
export const hooks: {byoGuard: () => boolean; byoClear: () => void; bGet: any; bCheck: any; bLine: any} = {byoGuard: () => false, byoClear: () => {}, bGet: null, bCheck: null, bLine: null};
export function navBack(): 'exit' | void {
  const c = cur();
  if (c.r === 'byo' && hooks.byoGuard()) return;
  ui.close();
  if (c.r === 'byo') hooks.byoClear();
  if (c.r === 'checkout' && S.cs > 0) {S.cs--; emit(); return;}
  if (S.stack.length > 1) S.stack.pop();
  else if (c.r === 'home') {S.stack = [{r: 'wantiss', u: ++uid}]; emit(); return 'exit';}
  else if (c.r !== 'wantiss') S.stack = [{r: 'home', u: ++uid}];
  emit();
}

/* ---------- cart ops ---------- */
export async function syncGroupOrderCartLine(groupId: string, line: CartLine) {
  const productId = IT[line.id] ? line.id : '';
  if (!productId) return {error: new Error('This cart item is not linked to a live catalogue product.')};
  return supabase.rpc('goodies_group_order_upsert_item', {
    p_group_id: groupId,
    p_product_id: productId,
    p_line_key: line.k,
    p_quantity: line.q,
    p_options: line.options || {},
    p_note: line.nt || null,
  });
}
/** Forget a saved group that has ended, expired or no longer includes this user, so it cannot block personal orders. */
export function clearActiveGroup() {
  S.groupOrder = {code: '', host: S.pf.n || 'You', members: [], serverBacked: false};
  save(); emit();
}
export async function validateActiveGroup(): Promise<boolean> {
  const g = S.groupOrder;
  if (!g?.serverBacked || !g.groupId) return false;
  if (g.expiresAt && new Date(g.expiresAt).getTime() <= Date.now()) {clearActiveGroup(); return false;}
  try {
    const {data, error} = await supabase.rpc('goodies_group_order_get_status', {p_group_id: g.groupId});
    if (error) {
      /* Only a definite "gone / not a member / closed" answer drops the group; a network error keeps it. */
      if (['P0002', '42501', 'P0001'].includes(String((error as any).code))) {clearActiveGroup(); return false;}
      console.warn('[Goodies] group status check failed', error);
      return true;
    }
    const row: any = Array.isArray(data) ? data[0] : data;
    if (!row || row.status !== 'open' || (row.expires_at && new Date(row.expires_at).getTime() <= Date.now())) {clearActiveGroup(); return false;}
    return true;
  } catch (e) {
    console.warn('[Goodies] group status check failed', e);
    return true;
  }
}
/** Mirror a personal-cart change into the active group. A failure is a plain, non-blocking notice and never stops the personal order. */
export async function syncActiveGroup(op: {line?: CartLine; removeKey?: string}) {
  const g = S.groupOrder;
  if (!g?.serverBacked || !g.groupId) return;
  if (!(await validateActiveGroup())) return;
  const r: any = op.removeKey ? await removeGroupOrderCartLine(g.groupId, op.removeKey) : op.line ? await syncGroupOrderCartLine(g.groupId, op.line) : null;
  if (r?.error) {
    console.warn('[Goodies] group sync failed', r.error);
    toast(label("lbl.cms.b0b30ad199f5", "Saved to your cart. It could not be shared with the group just now."));
  }
}
export async function removeGroupOrderCartLine(groupId: string, lineKey: string) {
  return supabase.rpc('goodies_group_order_remove_item', {p_group_id: groupId, p_line_key: lineKey});
}

export function cartAdd(i: Item, o: {q: number; size?: number; drink?: number; off?: number; note?: string}, addStop = false) {
  if (!canBuy(i)) return;
  const c = S.cart;
  if (!addStop && c.sid && c.lines.length && !cartStoreIds().includes(i.s)) {S.pend = [i, o]; ui.sheet({kind: 'newcart', from: STB[c.sid].n, to: STB[i.s].n, canMerge: canAddStop(i.s), stops: cartStoreIds().length, max: maxStops()}); return;}
  if (qtyIn(i.id) + o.q > i.stock) {toast(label('lbl.actionOnlyAvailable', 'Only {count} available').replace('{count}', String(i.stock))); return;}
  if ((i as any).restriction === 'alcohol' && !S.alcAck) {S.pend = [i, o]; ui.sheet({kind: 'alcrules'}); return;}
  if (!c.sid || !c.lines.length) c.sid = i.s;
  const base = o.off ? dp(i, o.off) : i.p, unit = base + ((o.size || 0) > 0 ? 1.5 : 0) + (o.drink ? 1 : 0);
  const k = [i.id, o.size, o.drink, o.off || 0, o.note || ''].join('|'), l = c.lines.filter((x: CartLine) => x.k === k)[0];
  if (l) { l.q += o.q; if (!l.photo && i.photo) l.photo = i.photo; }
  else c.lines.push({k, s: i.s, id: i.id, n: i.n, e: i.e, photo: i.photo || null, p: unit, q: o.q, d: [(o.size || 0) > 0 ? 'Large' : o.size === 0 && ['restaurants', 'bakery', 'beverages'].indexOf(STB[i.s].c) > -1 ? 'Regular' : '', o.drink ? '+ drink' : '', o.note || ''].filter(Boolean).join(', '), options: {size: ['restaurants', 'bakery', 'beverages'].includes(STB[i.s].c) ? ((o.size || 0) > 0 ? 'large' : 'regular') : null, drink: !!o.drink, discount_pct: Number(o.off || 0)}});
  {const order = cartStoreIds(); c.lines.sort((x: CartLine, y: CartLine) => order.indexOf(lineStore(x)) - order.indexOf(lineStore(y)));}
  S.bump = 1;
  const activeGroup = S.groupOrder;
  if (activeGroup?.serverBacked && activeGroup?.groupId && activeGroup?.storeId === i.s) {
    const groupLine = c.lines.find((x: CartLine) => x.k === k);
    if (groupLine) void syncActiveGroup({line: {...groupLine}});
  }
  toast(label('lbl.actionAddedToCart', 'Added {item} to your cart').replace('{item}', i.n)); save(); emit();
}
export function reorderLines(o: Order) {
  const s = STB[o.sid], miss: string[] = [], ok: CartLine[] = [];
  o.lines.forEach(l => {
    if (l.byo) {
      const b = hooks.bGet(l.byo.sid, l.byo.bid), d = {sid: l.byo.sid, size: l.byo.size, sel: l.byo.sel, note: l.nt || ''};
      if (!b || !s.open || !hooks.bCheck(b, d).ok) {miss.push(l.n); return;}
      ok.push(hooks.bLine(b, d, l.q)); return;
    }
    const i = IT[l.id];
    if (!i || i.oos || !s.open || i.stock < 1) miss.push(l.n);
    else ok.push({k: l.k, id: l.id, n: l.n, e: l.e, photo: i.photo || l.photo || null, p: l.p, q: Math.min(l.q, i.stock), d: l.d});
  });
  return {ok, miss};
}
export function filt(list: Store[]) {
  const f = S.f; let l = list.slice();
  if (f === 'offers') l = l.filter(s => s.pr);
  if (f === 'free') l = l.filter(s => s.fee === 0);
  if (f === 'top') l = l.filter(s => s.r >= 4.5);
  if (f === 'fast') l = l.filter(s => parseInt(s.eta.split('–')[1], 10) <= 30);
  if (f === 'open') l = l.filter(s => s.open);
  if (f === 'near') l.sort((a, b) => (a.live && !a.distanceReady ? Number.POSITIVE_INFINITY : a.km) - (b.live && !b.distanceReady ? Number.POSITIVE_INFINITY : b.km));
  return l;
}
const filterChoice = (key:string, text:()=>string):[string,string] => {
  const row:[string,string]=[key,''];
  Object.defineProperty(row,1,{enumerable:true,get:text});
  return row;
};
export const FCH:[string,string][] = [
  filterChoice('',()=>label('lbl.filterAll','All')),
  filterChoice('offers',()=>label('lbl.filterOffers','Offers')),
  filterChoice('free',()=>label('lbl.filterFree','Free delivery')),
  filterChoice('top',()=>label('lbl.filterTop','Rating 4.5+')),
  filterChoice('fast',()=>label('lbl.filterFast','Under 30 min')),
  filterChoice('open',()=>label('lbl.filterOpen','Open now')),
  filterChoice('near',()=>label('lbl.filterNearest','Nearest')),
];

/* demo only: wipes local data */
export async function resetDemo() {
  const {assertDemoOnly} = require('./providers');
  assertDemoOnly('Reset demo data');
  await AsyncStorage.multiRemove([KEY, WKEY, 'goodies-checkout-attempt-v1']);
  Object.assign(S, WDEF(), GDEF());
  S.stack = [{r: 'home', u: ++uid}];
  applyZone(); emit();
}

/* ---------- restricted goods (alcohol) ---------- */
export const hasAlcohol = (lines?: CartLine[]) => (lines || S.cart.lines).some((l: any) => !l.byo && IT[l.id] && (IT[l.id] as any).restriction === 'alcohol');
export const alcAge = (pickupStoreId?: string | null) => {
  const cc = isPk() ? ((pickupStoreId && (STB[pickupStoreId] as any).cc) || 'HT') : (addr() as any).cc || 'HT';
  return {cc, age: contentHooks.minAge ? contentHooks.minAge(cc) : cc === 'HT' || cc === 'DO' ? 18 : 21};
};
