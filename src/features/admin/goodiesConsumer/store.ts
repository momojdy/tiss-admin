
import {useSyncExternalStore} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {supabase} from '../lib/supabase';
import {providerInfo} from './providers';
import type {Store, Item, Address, CartLine, Order} from './data/types';
import {STAGES_DELIVERY, STAGES_PICKUP} from './data/seed';
import {assertDemoOnly} from './providers';
export const KEY = 'goodies-live-v4';

/** Isolated read-only customer-screen preview inside Wantiss Admin. */
export let previewOnly = false;
export const setPreviewOnly = (value: boolean) => { previewOnly = value; };
/** True only while the admin editor is in edit mode: taps select elements and must not navigate. */
export let editLocked = false;
export const setEditLocked = (value: boolean) => { editLocked = value; };
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
export const dp = (i: Item, off: number) => Math.round(i.p * (100 - off)) / 100;
export const cname = (id: string, cats: {id: string; name: any}[]) => (cats.find(c => c.id === id) as any)?.name || 'All stores';
export const zoneOf = (t: string) => {let x = 0; for (let i = 0; i < t.length; i++) x = (x * 31 + t.charCodeAt(i)) % 97; return Math.round((x % 5) * 9) / 10;};
export const phoneOK = (s: string) => {s = String(s || '').trim(); const d = s.replace(/\D/g, ''); return /^[+\d][\d\s().-]*$/.test(s) && d.length >= 8 && d.length <= 15;};
const WDEF = () => ({
  pf: {n: '', e: '', ph: '', av: ''},
  addr: [] as Address[],
});
const GDEF = () => ({
  serverUnread: 0,
  notifs: [] as any[],
  orders: [] as Order[], cart: {sid: null as string | null, lines: [] as CartLine[]}, fav: [] as string[], favp: [] as string[], cards: [] as any[],
  wallet: 0, hasWallet: false, pay: 'cash', selectedCardId: '', mode: 'delivery', tip: 0, promo: '', as: 0, gc: [] as any[], cc: 'w', np: {orders: 0, promos: 0}, rev: {} as any, driverRev: {} as any, rec: [] as any[], rv: [] as any[], groupOrder: null as any,
});
export const WP = ['pf', 'addr'], GP = ['notifs', 'orders', 'cart', 'fav', 'favp', 'pay', 'mode', 'tip', 'promo', 'as', 'gc', 'cc', 'np', 'rev', 'driverRev', 'rec', 'rv', 'groupOrder'];

export interface Route {r: string; p?: any; u: number; sy?: number}
export const S: any = Object.assign(WDEF(), GDEF());
let uid = 0;
S.stack = [{r: 'home', u: ++uid}] as Route[];
Object.assign(S, {f: '', sub: '', ot: 'active', ft: 'stores', sh: null, pend: null, bump: 0, cs: 0, time: 'ASAP', sch: 0, note: '', pin: '', busy: 0, ss: {}, srt: 'rel', sr: {q: '', sort: 'rel', f: {}}, theme: 'light', lang: 'en', ready: false});
const subs = new Set<() => void>();
let ver = 0;
export const emit = () => {ver++; subs.forEach(f => f());};
export function useGoodies() {return useSyncExternalStore(cb => {subs.add(cb); return () => {subs.delete(cb);};}, () => ver);}
export const ui: {toast: (t: string) => void; sheet: (h: any) => void; close: () => void} = {toast: () => {}, sheet: () => {}, close: () => {}};
export const toast = (t: string) => ui.toast(t);

function formatHour(d: Date) {
  let h = d.getHours(), m = String(d.getMinutes()).padStart(2, '0');
  return (h % 12 || 12) + (m === '00' ? '' : ':' + m) + (h >= 12 ? 'pm' : 'am');
}
const CAT_EMOJI: Record<string, string> = {restaurants: 'food', produce: 'produce', beverages: 'beverage', bakery: 'bakery', meat: 'meat', groceries: 'groceries', haitian: 'haiti', care: 'care', drugstore: 'medicine'};
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
type DayHours = {open: string; close: string; closed: boolean};
const hm = (v: any): number | null => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(v || ''));
  if (!m) return null;
  const h = +m[1], mi = +m[2];
  return h > 24 || mi > 59 ? null : h * 60 + mi;
};
const fmtHM = (min: number) => {const d = new Date(); d.setHours(Math.floor(min / 60) % 24, min % 60, 0, 0); return formatHour(d);};
const bgOf = (id: string) => 'bg' + Array.from(id).reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 5, 0);

/* Open or closed from the weekly hours, in the device's local time (the store and its customers share a city). */
export function openState(hours: Record<string, DayHours> | null | undefined, now: Date = new Date()): {open: number; h: string; nx: string} {
  if (!hours || typeof hours !== 'object' || !Object.keys(hours).length) return {open: 0, h: '', nx: 'Opening hours not set'};
  const win = (day: number) => {
    const d: any = (hours as any)[DAY_NAMES[((day % 7) + 7) % 7]];
    if (!d || d.closed) return null;
    const o = hm(d.open), c = hm(d.close);
    return o == null || c == null ? null : {o, c};
  };
  const nowMin = now.getHours() * 60 + now.getMinutes(), today = now.getDay(), tw = win(today), yw = win(today - 1);
  let open = 0, closesAt = 0;
  if (tw) {
    if (tw.c > tw.o) {if (nowMin >= tw.o && nowMin < tw.c) {open = 1; closesAt = tw.c;}}
    else if (nowMin >= tw.o) {open = 1; closesAt = tw.c;} /* closes after midnight */
  }
  if (!open && yw && yw.c <= yw.o && nowMin < yw.c) {open = 1; closesAt = yw.c;}
  const h = tw ? fmtHM(tw.o) + '–' + fmtHM(tw.c) : 'Closed today';
  if (open) return {open, h, nx: 'Open until ' + fmtHM(closesAt)};
  for (let off = 0; off <= 7; off++) {
    const w = win(today + off);
    if (!w || (off === 0 && nowMin >= w.o)) continue;
    const when = off === 0 ? ' today' : off === 1 ? ' tomorrow' : ' ' + DAY_NAMES[(today + off) % 7];
    return {open: 0, h, nx: 'Opens ' + fmtHM(w.o) + when};
  }
  return {open: 0, h, nx: 'Currently closed'};
}

function liveStore(r: any, items: Item[]): Store {
  const id = String(r.store_id || r.business_id), names = r.names && typeof r.names === 'object' ? r.names : {};
  const eMin = Number(r.eta_min) || 20, eMax = Number(r.eta_max) || 35, st = openState(r.hours);
  const store: Store = {
    id, businessId: String(r.business_id), c: r.category || 'groceries', e: CAT_EMOJI[r.category] || 'store', bg: bgOf(id), r: 0, rv: 0, km: 0, km0: 0,
    eta: eMin + '–' + eMax, eta0: eMin + '–' + eMax, fee: Number(r.delivery_fee) || 0, min: Number(r.min_order) || 0,
    pr: r.promo || '', k: r.kind || '', it: items, open: st.open, h: st.h, nx: st.nx, far: false, live: true,
    logo: r.logo_url || null, cover: null, acceptScheduledOrders: !!r.accept_scheduled_orders,
    scheduledOrderStartMinutes: Number(r.scheduled_order_start_minutes ?? 60), scheduleHours: r.hours || undefined,
    businessName: r.business_name || '', businessDescription: r.description || '', businessPhone: r.phone || '', businessEmail: r.email || '', businessWebsite: r.website || '',
    businessAddress: r.address || '', businessCity: r.city || '', businessCountry: r.country || '', businessDeliveryModes: Array.isArray(r.delivery_modes) ? r.delivery_modes : [], businessLogoUrl: r.logo_url || '',
    get n() {const t = names[S.lang]; return (typeof t === 'string' && t.trim()) || r.business_name || 'Store';},
  } as Store;
  return store;
}

function placeholderStore(sid: string, name: string): Store {
  return {
    id: sid, n: name || 'Store', c: '', e: 'store', bg: bgOf(sid), r: 0, rv: 0, km: 0, km0: 0, eta: '0–0', eta0: '0–0', fee: 0, min: 0, pr: '', k: '', it: [],
    open: 0, h: '', nx: 'No longer taking orders', far: false, acceptScheduledOrders: false,
  };
}

let liveTimer: any = null;
export async function refreshLiveSchedules() {
  try {
    const {data: rows, error} = await supabase.from('goodies_store_schedules')
      .select('business_id,store_id,business_name,description,phone,email,website,address,city,country,delivery_modes,logo_url,hours,accept_scheduled_orders,scheduled_order_start_minutes,category,kind,min_order,delivery_fee,eta_min,eta_max,promo,names')
      .eq('is_live', true);
    if (error) throw error;
    const stores: any[] = rows || [], prods: any[] = [];
    if (stores.length) {
      const ids = stores.map(r => r.business_id);
      for (let from = 0; ; from += 1000) {
        const pr = await supabase.from('goodies_products')
          .select('id,business_id,name,description,price,emoji,stock,restriction,photo_url,sort_order,created_at')
          .in('business_id', ids).eq('is_available', true)
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
      const it: Item = {id: p.id, s: String(r.store_id || r.business_id), n: p.name, p: Number(p.price) || 0, e: p.emoji || 'package', stock, oos: stock < 1 ? 1 : 0, d: p.description || '', al: '', w: false, restriction: p.restriction || null, photo: p.photo_url || null};
      IT[p.id] = it; byBiz[r.business_id].push(it);
    });
    stores.forEach(r => {const s = liveStore(r, byBiz[r.business_id] || []); const rating = ratingByBiz[String(r.business_id)]; if (rating?.count) { s.r = Math.round((rating.sum / rating.count) * 10) / 10; s.rv = rating.count; } STB[s.id] = s; ST.push(s);});
    (S.orders || []).forEach((o: any) => {if (o && o.sid && !STB[o.sid]) STB[o.sid] = placeholderStore(o.sid, o.sn);});
    if (S.cart && S.cart.sid && !STB[S.cart.sid]) STB[S.cart.sid] = placeholderStore(S.cart.sid, '');
    S.catalogError = '';
    applyZone();
  } catch (e: any) {
    S.catalogError = String(e?.message || e || 'Could not load stores');
  }
  if (!liveTimer) {
    liveTimer = setInterval(() => {
      let ch = false;
      ST.forEach(s => {
        if (!s.live) return;
        const o = openState(s.scheduleHours);
        if (o.open !== s.open || o.nx !== s.nx || o.h !== s.h) {s.open = o.open; s.nx = o.nx; s.h = o.h; ch = true;}
      });
      if (ch) emit();
    }, 60000);
  }
  emit();
}
export async function load() {
  const merge = async (key: string, D: any) => {
    try {
      const raw = JSON.parse((await AsyncStorage.getItem(key)) || 'null');
      if (raw && typeof raw === 'object') for (const k in D) if (raw[k] !== undefined && typeof raw[k] === typeof D[k] && Array.isArray(raw[k]) === Array.isArray(D[k])) S[k] = raw[k];
    } catch (e) {}
  };
  if (!previewOnly) { await merge(WKEY, WDEF()); await merge(KEY, GDEF()); }
  S.wallet = 0; S.hasWallet = false; S.cards = []; S.selectedCardId = '';
  if (!previewOnly && !providerInfo.demo) {
    try {
      const {data: sessionData} = await supabase.auth.getUser();
      const userId = sessionData.user?.id;
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
  // Admin preview must not read or reuse customer-device preferences.
  if (!previewOnly) {
    try {const t = await AsyncStorage.getItem('goodies-theme'); if (t === 'light' || t === 'dark') S.theme = t;} catch (e) {}
    try {const l = await AsyncStorage.getItem('goodies-lang'); if (l) S.lang = l;} catch (e) {}
  }
  /* The catalog must be loaded before the cart, favorites and orders are checked against it. */
  await refreshLiveSchedules();
  /* Ported from v24: sanitize cached state before cart, favorites, and order checks. */
  const c = S.cart;
  if (!c || !Array.isArray(c.lines)) S.cart = {sid: null, lines: []};
  S.cart.lines = S.cart.lines.filter((l: any) => l && ((l.byo && l.byo.bid && l.byo.sel && l.byo.lines) || IT[l.id]) && l.q > 0);
  if (!S.cart.lines.length) S.cart.sid = null;
  S.orders = S.orders.filter((o: any) => o && STB[o.sid] && Array.isArray(o.lines));
  S.fav = S.fav.filter((x: string) => STB[x]); S.favp = S.favp.filter((x: string) => IT[x]);
  S.addr = S.addr.filter((a: any) => a && a.t); if (!S.addr.length) S.addr = WDEF().addr;
  S.addr.forEach((a: any) => {if (typeof a.z !== 'number') a.z = zoneOf(a.t); if (!a.cc) a.cc = 'HT';});
  if (S.addr.length && !S.addr.some((a: Address) => a.def)) S.addr[0].def = 1;
  if (!S.pf || !S.pf.n) S.pf = WDEF().pf; if (!S.pf.ph) S.pf.ph = WDEF().pf.ph;
  S.gc = S.gc.filter((c: any) => c && c.id && c.ph);
  if (S.cc !== 'w' && !S.gc.some((c: any) => c.id === S.cc)) S.cc = 'w';
  if (!S.addr.some((a: Address) => a.id === S.as)) S.as = defAddr()?.id ?? 0;
  applyZone(); S.ready = true; emit();
}
export function save() {
  if (previewOnly) return;
  try {
    const w: any = {}, g: any = {};
    WP.forEach(k => (w[k] = S[k])); GP.forEach(k => (g[k] = S[k]));
    AsyncStorage.setItem(WKEY, JSON.stringify(w)); AsyncStorage.setItem(KEY, JSON.stringify(g));
  } catch (e) {}
}
export const setTheme = (t: 'light' | 'dark') => {S.theme = t; if (!previewOnly) AsyncStorage.setItem('goodies-theme', t); emit();};
export const setLang = (l: string) => {S.lang = l; if (!previewOnly) AsyncStorage.setItem('goodies-lang', l); emit();};
export const defAddr = (): Address => S.addr.filter((a: Address) => a.def)[0] || S.addr[0];
export const addr = (): Address => S.addr.filter((a: Address) => a.id === S.as)[0] || defAddr();
export const cur = (): Route => S.stack[S.stack.length - 1];
export const cnt = () => S.cart.lines.reduce((a: number, l: CartLine) => a + l.q, 0);
export const unread = () => Number(S.serverUnread || 0) > 0 || S.notifs.some((n: any) => n.u);
export const first = () => S.orders.length === 0;
export const isPk = () => S.mode === 'pickup' || !!(S.cart.sid && STB[S.cart.sid].far);
export function applyZone() {
  const z = addr()?.z || 0, d = Math.round(z * 3);
  ST.forEach(s => {
    /* Live stores have no geo data yet, so no invented distance or ETA padding. */
    if (s.live) {s.km = 0; s.eta = s.eta0; s.far = false; return;}
    s.km = Math.round((s.km0 + z) * 10) / 10;
    const q = s.eta0.split('–');
    s.eta = (+q[0] + d) + '–' + (+q[1] + d);
    s.far = s.km > feesNow().far;
  });
}
export function ctOf() {
  if (S.cc !== 'w') {const c = S.gc.filter((x: any) => x.id === S.cc)[0]; if (c) return {id: c.id, ph: c.ph, l: c.l || 'Goodies number', w: 0};}
  return {id: 'w', ph: S.pf.ph, l: 'Default Wantiss number', w: 1};
}
export const done = (o: Order) => o.cx || ['declined', 'expired', 'cancelled'].includes(String((o as any).serverStatus || '').toLowerCase()) || (o.st as number) >= (o.pk ? 4 : 6);
export const TL = STAGES_DELIVERY, TP = STAGES_PICKUP;
export function stage(o: Order) {
  if (!o.backendId) return 0;
  const map: Record<string, number> = {scheduled: 0, placed: 0, accepted: 1, preparing: 2, ready: 3, completed: o.pk ? 4 : 6, cancelled: 0, declined: 0, expired: 0};
  return map[String(o.serverStatus || 'scheduled').toLowerCase()] ?? 0;
}
export function notify(t: string, d: string, r: string, p: string, k?: string) {
  if (k === 'o' && !S.np.orders) return;
  if (k === 'p' && !S.np.promos) return;
  S.notifs.unshift({id: Date.now() + Math.random(), t, d, r, p, u: 1});
}
export function pChk(code: string, sub: number, sid: string | null) {
  const p = coupons().filter((x: any) => x.c === code)[0];
  if (!p) return {e: 'That code is not valid'} as any;
  if (p.st && sid && p.st !== sid) return {e: 'Only valid at ' + STB[p.st].n} as any;
  if (sub < p.min) return {e: 'Spend ' + money(p.min - sub) + ' more to use ' + code} as any;
  return {p} as any;
}
export function totals() {
  const st = S.cart.sid ? STB[S.cart.sid] : null;
  const sub = S.cart.lines.reduce((a: number, l: CartLine) => a + l.p * l.q, 0), pk = isPk();
  const pc: any = S.promo && sub ? pChk(S.promo, sub, S.cart.sid) : {}, p = pc.p, ship = p && p.ty === 'ship';
  const F = feesNow(), fee = !st || pk ? 0 : (first() && F.firstFree) || ship || st.fee === 0 ? 0 : st.fee, svc = sub ? F.svc : 0;
  const disc = p && p.ty === 'pct' ? Math.round(sub * p.v) / 100 : 0, tip = pk ? 0 : S.tip;
  return {st, sub, fee, svc, disc, tip, total: sub + fee + svc - disc + tip, free: !!st && !pk && st.fee > 0 && fee === 0, perr: S.promo && sub && pc.e ? pc.e : '', pok: !!p};
}
export const qtyIn = (id: string) => S.cart.lines.filter((l: CartLine) => l.id === id).reduce((a: number, l: CartLine) => a + l.q, 0);
export function canBuy(i: Item) {
  const s = STB[i.s];
  if (!s.open && !s.acceptScheduledOrders) {toast(s.n + ' is closed. ' + s.nx); return false;}
  if (i.oos) {toast('Sorry, ' + i.n + ' is out of stock'); return false;}
  return true;
}
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
export function cartAdd(i: Item, o: {q: number; size?: number; drink?: number; off?: number; note?: string}) {
  if (!canBuy(i)) return;
  const c = S.cart;
  if (c.sid && c.sid !== i.s && c.lines.length) {S.pend = [i, o]; ui.sheet({kind: 'newcart', from: STB[c.sid].n, to: STB[i.s].n}); return;}
  if (qtyIn(i.id) + o.q > i.stock) {toast('Only ' + i.stock + ' available'); return;}
  if ((i as any).restriction === 'alcohol' && !S.alcAck) {S.pend = [i, o]; ui.sheet({kind: 'alcrules'}); return;}
  c.sid = i.s;
  const base = o.off ? dp(i, o.off) : i.p, unit = base + ((o.size || 0) > 0 ? 1.5 : 0) + (o.drink ? 1 : 0);
  const k = [i.id, o.size, o.drink, o.off || 0, o.note || ''].join('|'), l = c.lines.filter((x: CartLine) => x.k === k)[0];
  if (l) l.q += o.q;
  else c.lines.push({k, id: i.id, n: i.n, e: i.e, p: unit, q: o.q, d: [(o.size || 0) > 0 ? 'Large' : o.size === 0 && ['restaurants', 'bakery', 'beverages'].indexOf(STB[i.s].c) > -1 ? 'Regular' : '', o.drink ? '+ drink' : '', o.note || ''].filter(Boolean).join(', ')});
  S.bump = 1; toast('Added ' + i.n + ' to your cart'); save(); emit();
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
    else ok.push({k: l.k, id: l.id, n: l.n, e: l.e, p: l.p, q: Math.min(l.q, i.stock), d: l.d});
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
  if (f === 'near') l.sort((a, b) => a.km - b.km);
  return l;
}
export const FCH: [string, string][] = [['', 'All'], ['offers', 'Offers'], ['free', 'Free delivery'], ['top', 'Rating 4.5+'], ['fast', 'Under 30 min'], ['open', 'Open now'], ['near', 'Nearest']];

/* demo only: wipes local data */
export async function resetDemo() {
  assertDemoOnly('Reset demo data');
  await AsyncStorage.multiRemove([KEY, WKEY]);
  Object.assign(S, WDEF(), GDEF());
  S.stack = [{r: 'home', u: ++uid}];
  applyZone(); emit();
}
export const hasAlcohol = (lines?: CartLine[]) => (lines || S.cart.lines).some((l: any) => !l.byo && IT[l.id] && (IT[l.id] as any).restriction === 'alcohol');
export const alcAge = (pickupStoreId?: string | null) => {
  const cc = isPk() ? ((pickupStoreId && (STB[pickupStoreId] as any).cc) || 'HT') : (addr() as any).cc || 'HT';
  return {cc, age: contentHooks.minAge ? contentHooks.minAge(cc) : cc === 'HT' || cc === 'DO' ? 18 : 21};
};
