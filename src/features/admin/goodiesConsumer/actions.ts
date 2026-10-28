/* Goodies customer actions and their state transitions. */
import {providerInfo} from './providers';
import {supabase} from '../lib/supabase';
import {
  hasAlcohol, alcAge, S, IT, STB, ui, toast, emit, save, push, reset, navBack, cartAdd, qtyIn, cnt, totals, pChk, isPk, addr, ctOf, phoneOK, reorderLines, money, hooks, done, cur, refreshLiveSchedules, previewOnly, editLocked,
} from './store';

export const CHOOSE_SIZE_CATS = ['restaurants', 'bakery', 'beverages'];

/* While the admin editor is in edit mode, taps select elements instead of navigating. */
export const go = (r: string, p?: any) => {if (editLocked) return; S.f = ''; S.sub = ''; push(r, p);};
export const tab = (p: string) => {if (editLocked) return; S.f = ''; reset(p);};
export const back = () => {if (editLocked) return; navBack();};
export const browse = () => {if (editLocked) return; S.f = ''; reset('home');};

export function heart(id: string) {
  const i = S.fav.indexOf(id);
  if (i > -1) {S.fav.splice(i, 1); toast('Removed from favorites');} else {S.fav.push(id); toast('Saved to favorites');}
  save(); emit();
}
export function favp(id: string) {
  const i = S.favp.indexOf(id);
  if (i > -1) {S.favp.splice(i, 1); toast('Removed from favorites');} else {S.favp.push(id); toast('Saved to favorites');}
  save(); emit();
}
export function openProduct(id: string, off = 0) {
  const i = IT[id];
  S.sh = {id, off, size: CHOOSE_SIZE_CATS.indexOf(STB[i.s].c) > -1 ? -1 : 0, drink: 0, q: 1, note: ''};
  S.rv = [id].concat(S.rv.filter((x: string) => x !== id)).slice(0, 8);
  push('product', id);
}
export function quickAdd(id: string, off = 0) {
  const i = IT[id], s = STB[i.s];
  if (CHOOSE_SIZE_CATS.indexOf(s.c) > -1) {openProduct(id, off); return;}
  cartAdd(i, {q: 1, size: 0, drink: 0, off});
}
export function promoSheet(p: 'free' | 'points' | 'produce') {ui.sheet({kind: 'promo', p});}
export function promoGo(cat: string) {ui.close(); S.f = ''; push('catlist', cat);}

/* product sheet state */
export const setSize = (n: number) => {S.sh.size = n; emit();};
export const toggleDrink = () => {S.sh.drink = S.sh.drink ? 0 : 1; emit();};
export function productQty(delta: number) {
  const i = IT[S.sh.id], n = S.sh.q + delta;
  if (n < 1) return;
  if (n + qtyIn(i.id) > i.stock) {toast('Only ' + i.stock + ' available'); return;}
  S.sh.q = n; emit();
}
export function productAdd() {
  const h = S.sh, i = IT[h.id];
  if (CHOOSE_SIZE_CATS.indexOf(STB[i.s].c) > -1 && h.size < 0) {toast('Choose a size first'); return;}
  const n0 = cnt();
  cartAdd(i, {q: h.q, size: h.size, drink: h.drink, off: h.off, note: (h.note || '').trim()});
  if (cnt() > n0 && cur().r === 'product') navBack();
}
export function newCart() {
  const p = S.pend;
  if (!p || !p[0] || !p[1]) {
    ui.close();
    toast('Please select the product again and retry.');
    return;
  }
  if (p[2]) { S.pend = null; p[2](); return; }
  // Clear the pending cross-store action before re-adding so the confirmation
  // cannot reopen itself or leave stale vendor/product data in demo mode.
  S.pend = null;
  S.cart = {sid: null, lines: []};
  S.promo = '';
  ui.close();
  const n0 = cnt();
  cartAdd(p[0], p[1]);
  if (cnt() > n0 && cur().r === 'product') navBack();
}
export function qty(k: string, v: number) {
  const l = S.cart.lines;
  for (let i = 0; i < l.length; i++) if (l[i].k === k) {
    const n = l[i].q + v, mx = l[i].byo ? 20 : IT[l[i].id].stock;
    if (n > mx && v > 0) {toast('Only ' + mx + ' available'); return;}
    l[i].q = n; if (n < 1) l.splice(i, 1);
    break;
  }
  if (!l.length) {S.cart.sid = null; S.promo = '';}
  save(); emit();
}
export const clearAsk = () => ui.sheet({kind: 'clear'});
export function clearCart() {S.cart = {sid: null, lines: []}; S.promo = ''; ui.close(); toast('Cart cleared'); save(); emit();}
export const setMode = (m: string) => {S.mode = m; save(); emit();};
export const setTip = (n: number) => {S.tip = n; save(); emit();};
export const setSch = (n: number) => {S.sch = n; save(); emit();};
export function promoApply(code: string) {
  const c = (code || '').trim().toUpperCase(); S.pin = c;
  const t = totals(), r = pChk(c, t.sub, S.cart.sid);
  if (r.e) {toast(r.e); return;}
  S.promo = c; S.pin = ''; toast(c + ' applied'); save(); emit();
}
export const promoClear = () => {S.promo = ''; save(); emit();};
export function usePromo(c: string) {
  if (S.cart.lines.length) {const r = pChk(c, totals().sub, S.cart.sid); if (r.e) {toast(r.e); return;} toast(c + ' applied');}
  else toast(c + ' saved. It applies when you check out');
  S.promo = c; save(); emit();
}
export function goCheckout() {
  const t = totals();
  if (!S.cart.lines.length) {toast('Your cart is empty'); return;}
  if (!t.st!.open && !t.st!.acceptScheduledOrders) {toast(t.st!.n + ' is closed. ' + t.st!.nx); return;}
  if (t.sub < t.st!.min) {toast('Minimum order is ' + money(t.st!.min)); return;}
  S.cs = 0; push('checkout');
}
export function checkoutNext() {
  if (S.cs === 0 && !isPk()) {const a = addr(); if (!a || !a.t) {toast('Choose a delivery address'); return;}}
  if (S.cs === 0 && !phoneOK(ctOf().ph)) {toast('Choose a valid contact number'); return;}
  if (S.cs === 1 && S.sch && S.sch < Date.now()) {S.sch = 0; toast('That time has passed. Pick another'); emit(); return;}
  if (S.cs === 1 && !STB[S.cart.sid!]?.open && (!STB[S.cart.sid!]?.acceptScheduledOrders || !S.sch || S.sch <= Date.now())) {toast('This store is closed. Choose a future opening-time slot to continue.'); emit(); return;}
  if (S.cs === 2 && S.pay === 'card' && !S.cards.length) {push('payments'); return;}
  S.cs++; emit();
}
export function setPay(p: string) {
  if (p === 'card' && !S.cards.length) {push('payments'); return;}
  S.pay = p;
  if (p === 'card' && !S.cards.some((card: any) => card.id === S.selectedCardId)) S.selectedCardId = (S.cards.find((card: any) => card.isDefault) || S.cards[0])?.id || '';
  save(); emit();
}
export function setCard(id: string) {
  if (!S.cards.some((card: any) => card.id === id)) return;
  S.selectedCardId = id; save(); emit();
}
export async function placeOrder() {
  if (previewOnly) { toast('Placing orders is disabled in the admin preview.'); return; }
  if (S.busy) return;
  const t = totals(), st = t.st!;
  if (!S.cart.lines.length) {toast('Your cart is empty'); return;}
  if (!providerInfo.demo) {
    if (!['cash', 'wallet', 'card'].includes(S.pay)) {toast('Choose Wantiss Wallet, a saved card, or cash.'); S.cs = 2; emit(); return;}
    if (S.pay === 'card' && !S.cards.length) {toast('Add a saved card before checking out.'); push('payments'); return;}
    // The ID check result cannot be recorded yet, so age-restricted orders stay blocked in live mode.
    if (hasAlcohol()) {toast('Alcohol orders are not available yet.'); return;}
  }
  if (!st.open && !(st.acceptScheduledOrders && S.sch > Date.now())) {toast(st.n + ' is closed. Choose a future pickup or delivery time if scheduling is available.'); S.cs = 1; emit(); return;}
  const bad = S.cart.lines.filter((l: any) => {if (l.byo) return !!hooks.bCheck && !!(hooks as any).lineBad && !!(hooks as any).lineBad(l); const i = IT[l.id]; return !i || i.oos || l.q > i.stock;});
  if (bad.length) {toast(bad[0].n + ' ' + (bad[0].byo ? (hooks as any).lineBad(bad[0]) : 'is no longer available in that quantity')); reset('cart'); return;}
  if (t.sub < st.min) {toast('Minimum order is ' + money(st.min)); reset('cart'); return;}
  const pk = isPk(), a = addr();
  if (!pk && (!a || !a.t)) {toast('Choose a delivery address'); S.cs = 0; emit(); return;}
  const ct = ctOf();
  if (!phoneOK(ct.ph)) {toast('Choose a valid contact number'); S.cs = 0; emit(); return;}
  if (!providerInfo.demo) await refreshPaymentOptions();
  if (!providerInfo.demo && S.pay === 'wallet' && !S.hasWallet) {toast('Your Wantiss wallet is not available. Create a wallet or choose another payment method.'); push('payments'); return;}
  if (!providerInfo.demo && S.pay === 'wallet' && S.wallet < t.total) {toast('Insufficient Wantiss wallet balance. Add funds or choose a saved card or cash.'); push('payments'); return;}
  const alc = hasAlcohol();
  if (alc && !S.alcConsent) {toast('Please confirm the alcohol rules to continue'); return;}
  if (alc && !S.hasWallet) {toast('Create your Wantiss wallet first. Refunds for alcohol orders go there.'); push('payments'); return;}
  if (S.promo && t.perr) {S.promo = ''; toast('Your promo code no longer applies. Totals updated'); emit(); return;}
  if (S.sch && S.sch < Date.now()) {S.sch = 0; S.cs = 1; toast('That time has passed. Pick another'); emit(); return;}
  if (providerInfo.demo && S.pay === 'wallet' && S.wallet < t.total) {toast('Wallet balance is too low. Top up or pick another method.'); push('payments'); return;}
  if (providerInfo.demo && S.pay === 'card') {
    if (!S.cards.length) {push('payments'); return;}
    if (S.cards[0].l4 === '0002') {toast('Card declined (demo). Your cart is safe. Try another method.'); S.cs = 2; emit(); return;}
  }
  /* Demo orders are local; live wallet/card orders use authenticated server payment flows below. */
  S.busy = 1; emit();
  const selectedCard: any = S.cards.find((card: any) => card.id === S.selectedCardId) || S.cards.find((card: any) => card.isDefault) || S.cards[0];
  const pl: any = {wallet: 'Wallet', moncash: 'MonCash', card: 'Card •••• ' + (selectedCard ? selectedCard.l4 : ''), cash: 'Cash'}[S.pay as string];
  let id: string;
  do {id = 'GD' + Math.floor(1000 + Math.random() * 9000);} while (S.orders.some((x: any) => x.id === id));
  let backendOrderId: string | null = null;
  if (!providerInfo.demo) {
    // Live: the server validates the store, mode, schedule and totals, and assigns the order code.
    const r2 = (n: number) => Math.round(n * 100) / 100;
    const orderPayload = {
      p_store_id: S.cart.sid,
      p_order_type: pk ? 'pickup' : 'delivery',
      p_scheduled_for: S.sch && S.sch > Date.now() ? new Date(S.sch).toISOString() : null,
      p_address: pk ? null : {l: a.l, t: a.t, apt: a.apt, inst: a.inst},
      p_contact_phone: ct.ph,
      p_items: S.cart.lines.map((l: any) => ({k: l.k, id: l.id, n: l.n, e: l.e, p: l.p, q: l.q, d: l.d, nt: l.nt, byo: l.byo})),
      p_subtotal: r2(t.sub), p_delivery_fee: r2(t.fee), p_service_fee: r2(t.svc), p_discount: r2(t.disc), p_tip: r2(t.tip), p_total: r2(t.total),
      p_notes: String(S.note || '').trim() || null,
      p_promo_code: S.promo || null,
    };
    let data: any = null, error: any = null;
    if (S.pay === 'card') {
      const result = await supabase.functions.invoke('place-goodies-card-order', {
        body: { payment_method_id: (S.cards.find((card: any) => card.id === S.selectedCardId) || S.cards.find((card: any) => card.isDefault) || S.cards[0])?.id, idempotency_key: 'goodies-' + Date.now() + '-' + Math.random().toString(36).slice(2), order: orderPayload },
      });
      data = result.data; error = result.error;
    } else {
      const result = await supabase.rpc(S.pay === 'wallet' ? 'place_goodies_order_with_wallet' : 'place_goodies_order', orderPayload);
      data = result.data; error = result.error;
    }
    const row: any = Array.isArray(data) ? data[0] : data;
    if (error || !row?.id) {S.busy = 0; toast(error?.message || 'Could not place the order. Please try again.'); emit(); return;}
    backendOrderId = row.id; id = row.order_code || id;
    if (S.pay === 'wallet') await refreshPaymentOptions();
  }
  if (providerInfo.demo && S.pay === 'wallet') S.wallet -= t.total;
  const o = {
    id, backendId: backendOrderId, serverStatus: backendOrderId ? (S.sch && S.sch > Date.now() ? 'scheduled' : 'placed') : null, sid: S.cart.sid, lines: S.cart.lines.map((l: any) => ({k: l.k, id: l.id, n: l.n, e: l.e, p: l.p, q: l.q, d: l.d, nt: l.nt, byo: l.byo})),
    sn: st.n, sub: t.sub, fee: t.fee, svc: t.svc, disc: t.disc, tip: t.tip, total: t.total, t0: Date.now(), st: 0, rated: 0, cx: 0, pk,
    addr: pk ? st.n : a.t, ad: pk ? null : {l: a.l, t: a.t, apt: a.apt, inst: a.inst}, ph: ct.ph, phl: ct.w ? 'Wantiss number' : ct.l, cid: ct.id,
    pay: S.pay, payl: pl, note: String(S.note || '').trim(), sch: S.sch, promo: S.promo,
    alc: alc ? {...alcAge(S.cart.sid), who: pk ? 'shop' : 'courier', status: 'pending'} : null,
  };
  S.orders.unshift(o);
  S.cart = {sid: null, lines: []}; S.promo = ''; S.tip = 0; S.note = ''; S.sch = 0; S.cs = 0; S.cc = 'w'; S.alcConsent = false;
  if (!backendOrderId) S.notifs.unshift({id: Date.now() + Math.random(), t: 'Order ' + o.id + ' placed', d: 'Demo order sent to ' + st.n + '. Tap to track it.', r: 'track', p: o.id, u: 1});
  S.stack = [{r: 'home', u: Date.now()}, {r: 'confirm', p: o.id, u: Date.now() + 1}];
  S.busy = 0; toast(backendOrderId ? 'Order sent to the store' : 'Demo order placed!'); save(); emit();
  if (backendOrderId) void refreshLiveSchedules(); /* stock was reserved on the server */
}
export const cancelAsk = (id: string) => ui.sheet({kind: 'cancel', id});
export async function cancelOrder(id: string) {
  if (previewOnly) { ui.close(); toast('Order cancellation is disabled in the admin preview.'); return; }
  const o = S.orders.filter((x: any) => x.id === id)[0]; ui.close();
  if (!o || done(o) || o.st > 2) {toast('This order can no longer be cancelled'); emit(); return;}
  if (o.backendId) {
    const {error} = await supabase.rpc('set_goodies_order_status', {p_order_id: o.backendId, p_status: 'cancelled'});
    if (error) {toast(error.message || 'This order can no longer be cancelled'); emit(); return;}
    if (o.pay === 'card') {
      const refund = await supabase.functions.invoke('refund-goodies-card-order', {body: {order_id: o.backendId}});
      if (refund.error || refund.data?.error) toast('Order cancelled. Your card refund is pending and may need support follow-up.');
    }
  }
  o.cx = 1;
  if (providerInfo.demo && o.pay === 'wallet') S.wallet += o.total;
  else if (o.backendId && o.pay === 'wallet') await refreshPaymentOptions();
  if (providerInfo.demo) S.notifs.unshift({id: Date.now() + Math.random(), t: 'Order ' + o.id + ' cancelled', d: 'Your order was cancelled.' + (o.pay === 'wallet' ? ' The total was refunded to your wallet.' : ''), r: 'track', p: o.id, u: 1});
  toast('Order cancelled'); save(); emit();
  if (o.backendId) void refreshLiveSchedules(); /* stock was restored on the server */
}
export function reorder(id: string) {
  const o = S.orders.filter((x: any) => x.id === id)[0]; if (!o) return;
  const r = reorderLines(o);
  if (!r.ok.length) {toast(r.miss.length ? 'Those items are unavailable right now' : 'Nothing to reorder'); return;}
  const run = () => {S.cart = {sid: o.sid, lines: r.ok}; S.promo = ''; ui.close(); reset('cart'); toast(r.miss.length ? 'Added available items. Unavailable: ' + r.miss.join(', ') : 'Items added to your cart');};
  if (S.cart.sid && S.cart.sid !== o.sid && S.cart.lines.length) {S.ro = run; ui.sheet({kind: 'replace', from: STB[S.cart.sid].n});} else run();
}
export const runReorder = () => {if (S.ro) S.ro();};
export const setOrdersTab = (t: string) => {S.ot = t; emit();};
export function openNotif(id: any) {const n = S.notifs.filter((x: any) => x.id == id)[0]; if (!n) return; n.u = 0; push('ndetail', n.id);}
export const readAll = () => {S.notifs.forEach((n: any) => (n.u = 0)); emit();};
export const togglePref = (k: 'orders' | 'promos') => {S.np[k] = S.np[k] ? 0 : 1; save(); emit();};
export const selectAddr = (id: number) => {S.as = id; ui.close(); emit(); toast('Delivering to ' + addr().l + ' (Wantiss default unchanged)');};
export const setFilter = (k: string) => {S.f = k; emit();};
export const setSub = (k: string) => {S.sub = k; emit();};
export const clearFilters = () => {S.f = ''; S.sub = ''; emit();};

export const setConsent = (v: boolean) => {S.alcConsent = v; emit();};
export function alcAccept() {S.alcAck = 1; const p = S.pend; ui.close(); if (p && p[0] && !p[2]) cartAdd(p[0], p[1]); else if (p && p[2]) p[2]();}
export async function refreshPaymentOptions() {
  if (previewOnly) return;
  try {
    const {data: sessionData, error: sessionError} = await supabase.auth.getUser();
    if (sessionError || !sessionData.user) return;
    const userId = sessionData.user.id;
    const [walletResult, cardsResult] = await Promise.all([
      supabase.from('wallets').select('id,balance').eq('user_id', userId).maybeSingle(),
      supabase.rpc('get_my_payment_methods'),
    ]);
    if (!walletResult.error) {
      S.hasWallet = !!walletResult.data?.id;
      S.wallet = Number(walletResult.data?.balance || 0);
    }
    if (!cardsResult.error) {
      S.cards = (cardsResult.data || []).map((card: any) => ({
        id: card.id, b: String(card.brand || 'Card'), l4: String(card.last4 || ''),
        expiryMonth: card.expiry_month, expiryYear: card.expiry_year, isDefault: !!card.is_default,
      }));
      if (!S.cards.some((card: any) => card.id === S.selectedCardId)) S.selectedCardId = (S.cards.find((card: any) => card.isDefault) || S.cards[0])?.id || '';
    }
    save(); emit();
  } catch (e) {
    // Keep checkout available; its UI will show the last known state and retry on next entry.
  }
}
export async function createWallet() {
  if (previewOnly) { toast('Wallet changes are disabled in the admin preview.'); return; }
  try {
    const { error } = await supabase.rpc('ensure_my_wallet');
    if (error) throw error;
    await refreshPaymentOptions();
    toast('Wantiss wallet is ready');
  } catch (e: any) {
    toast(e?.message || 'Could not create your Wantiss wallet. Please try again.');
  }
}
/* DEMO ONLY: in production the courier app (delivery) or the Vendor Dashboard (pickup) records this result. */
export function idResult(id: string, ok: boolean) {
  require('./providers').assertDemoOnly('Simulated ID check');
  const o = S.orders.filter((x: any) => x.id === id)[0]; if (!o || !o.alc || o.alc.status !== 'pending') return;
  const F = require('./store').contentHooks.fees ? require('./store').contentHooks.fees() : {rfSvc: true, rfTip: true};
  if (ok) {o.alc.status = 'passed'; toast('ID checked. Order can be completed');}
  else {
    o.alc.status = 'failed'; o.cx = 1; o.idFail = 1;
    const refund = Math.round((o.sub - o.disc + (F.rfSvc ? o.svc : 0) + (F.rfTip ? o.tip : 0)) * 100) / 100;
    o.refund = o.pay === 'cash' ? 0 : refund;
    if (o.pay !== 'cash') S.wallet += refund;
    S.notifs.unshift({id: Date.now() + Math.random(), t: 'ID check failed', d: o.pay === 'cash' ? 'The ID check failed, so the order was not handed over. You were not charged.' : money(refund) + ' was refunded to your Wantiss wallet. The delivery fee is not refunded.', r: 'track', p: o.id, u: 1});
    toast('ID check failed. Order cancelled');
  }
  save(); emit();
}
