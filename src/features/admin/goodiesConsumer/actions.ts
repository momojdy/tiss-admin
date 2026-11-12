/* Actions. 1:1 port of the Goodies v24 `A` handlers. Messages stay in English here and move to i18n keys during the localization pass. */
import {providerInfo} from './providers';
import {fees, label} from './content';
import {previewBackend as supabase} from './previewRuntime';
import {friendlyError} from './friendlyError';
import {
  cartStoreIds, lineStore, storeSub, maxStops, hasAlcohol, alcAge, S, IT, STB, ui, toast, emit, save, push, reset, navBack, cartAdd, qtyIn, cnt, totals, pChk, isPk, addr, ctOf, phoneOK, reorderLines, money, hooks, done, cur, refreshLiveSchedules, refreshGoodiesAccess, first, contentHooks, getGoodiesCheckoutAttempt, completeGoodiesCheckoutAttempt, syncGroupOrderCartLine, removeGroupOrderCartLine, savedPoint, syncActiveGroup, validateActiveGroup, clearActiveGroup,
} from './store';

export const CHOOSE_SIZE_CATS = ['restaurants', 'bakery', 'beverages'];

export const go = (r: string, p?: any) => {S.f = ''; S.sub = ''; push(r, p);};
export const tab = (p: string) => {S.f = ''; reset(p);};
export const back = () => navBack();
export const browse = () => {S.f = ''; reset('home');};

export function heart(id: string) {
  const i = S.fav.indexOf(id);
  if (i > -1) {S.fav.splice(i, 1); toast(label('lbl.actionFavoriteRemoved', 'Removed from favorites'));} else {S.fav.push(id); toast(label('lbl.actionFavoriteSaved', 'Saved to favorites'));}
  save(); emit();
}
export function favp(id: string) {
  const i = S.favp.indexOf(id);
  if (i > -1) {S.favp.splice(i, 1); toast(label('lbl.actionFavoriteRemoved', 'Removed from favorites'));} else {S.favp.push(id); toast(label('lbl.actionFavoriteSaved', 'Saved to favorites'));}
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
  if (n + qtyIn(i.id) > i.stock) {toast(label('lbl.actionOnlyAvailable', 'Only {count} available').replace('{count}', String(i.stock))); return;}
  S.sh.q = n; emit();
}
export function productAdd() {
  const h = S.sh, i = IT[h.id];
  if (CHOOSE_SIZE_CATS.indexOf(STB[i.s].c) > -1 && h.size < 0) {toast(label('lbl.actionChooseSize', 'Choose a size first')); return;}
  const n0 = cnt();
  cartAdd(i, {q: h.q, size: h.size, drink: h.drink, off: h.off, note: (h.note || '').trim()});
  if (cnt() > n0 && cur().r === 'product') navBack();
}
export function newCart() {
  const p = S.pend;
  if (!p || !p[0] || !p[1]) {
    ui.close();
    toast(label('lbl.actionRetryProduct', 'Please select the product again and retry.'));
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
    if (n > mx && v > 0) {toast(label('lbl.actionOnlyAvailable', 'Only {count} available').replace('{count}', String(mx))); return;}
    l[i].q = n;
    const changedLine = {...l[i]};
    if (n < 1) l.splice(i, 1);
    const activeGroup = S.groupOrder;
    if (activeGroup?.serverBacked && activeGroup?.groupId && activeGroup?.storeId === S.cart.sid) {
      void syncActiveGroup(n < 1 ? {removeKey: changedLine.k} : {line: changedLine});
    }
    break;
  }
  if (!l.length) {S.cart.sid = null; S.promo = '';}
  else if (!cartStoreIds().includes(String(S.cart.sid))) S.cart.sid = cartStoreIds()[0] || null;
  save(); emit();
}
/** Adds the pending product as another store in the same order. */
export function addStop() {
  const p = S.pend;
  if (!p || !p[0] || !p[1]) {ui.close(); return;}
  S.pend = null; ui.close();
  const n0 = cnt();
  cartAdd(p[0], p[1], true);
  if (cnt() > n0 && cur().r === 'product') navBack();
}
export const clearAsk = () => ui.sheet({kind: 'clear'});
export function clearCart() {S.cart = {sid: null, lines: []}; S.promo = ''; clearActiveGroup(); ui.close(); toast(label('lbl.actionCartCleared', 'Cart cleared')); save(); emit();}
export const setMode = (m: string) => {S.mode = m; save(); emit();};
export const setTip = (n: number) => {S.tip = n; save(); emit();};
export const setSch = (n: number) => {S.sch = n; save(); emit();};
export function promoApply(code: string) {
  const c = (code || '').trim().toUpperCase(); S.pin = c;
  const t = totals(), r = pChk(c, t.sub, S.cart.sid);
  if (r.e) {toast(r.e); return;}
  S.promo = c; S.pin = ''; toast(label('lbl.actionPromoApplied', '{code} applied').replace('{code}', c)); save(); emit();
}
export const promoClear = () => {S.promo = ''; save(); emit();};
export function usePromo(c: string) {
  if (S.cart.lines.length) {const r = pChk(c, totals().sub, S.cart.sid); if (r.e) {toast(r.e); return;} toast(label('lbl.actionPromoApplied', '{code} applied').replace('{code}', c));}
  else toast(label('lbl.actionPromoSaved', '{code} saved. It applies when you check out').replace('{code}', c));
  S.promo = c; save(); emit();
}
export function goCheckout() {
  if (S.catalogError) {toast(label('lbl.catalogFailed', 'Could not load stores'));return;}
  if (!S.cart.lines.length) {toast(label('lbl.actionCartEmpty', 'Your cart is empty')); return;}
  const stopIds = cartStoreIds();
  if (stopIds.length > 1 && isPk()) {toast(label("lbl.cms.bcfa3aa2ef5b", "Ordering from several stores is available for delivery only.")); return;}
  for (const sid of stopIds) {
    const s = STB[sid];
    if (!s) continue;
    if (!s.open && !s.acceptScheduledOrders) {toast(label('lbl.actionStoreClosedNext', '{store} is closed. {next}').replace('{store}', s.n).replace('{next}', s.nx)); return;}
    if (storeSub(sid) < s.min) {toast(stopIds.length > 1 ? s.n + ': ' + label('lbl.actionMinimumOrder', 'Minimum order is {amount}').replace('{amount}', money(s.min)) : label('lbl.actionMinimumOrder', 'Minimum order is {amount}').replace('{amount}', money(s.min))); return;}
  }
  S.cs = 0; S.pay = 'wallet'; push('checkout');
}
export function checkoutNext() {
  if (S.cs === 0 && !isPk()) {const a = addr(); if (!a || !a.t) {toast(label('lbl.actionChooseAddress', 'Choose a delivery address')); return;}}
  if (S.cs === 0 && !phoneOK(ctOf().ph)) {toast(label('lbl.actionValidPhone', 'Choose a valid contact number')); return;}
  if (S.cs === 1 && S.sch && S.sch < Date.now()) {S.sch = 0; toast(label('lbl.actionTimePassed', 'That time has passed. Pick another')); emit(); return;}
  if (S.cs === 1 && cartStoreIds().some(id => !STB[id]?.open && (!STB[id]?.acceptScheduledOrders || !S.sch || S.sch <= Date.now()))) {toast(label('lbl.actionStoreClosedSchedule', 'This store is closed. Pick a time under "Schedule" and tap Apply to continue.')); emit(); return;}
  if (S.cs === 2) {
    if (['wallet','card'].includes(S.pay) && S.paymentOptionsStatus !== 'ready') {toast(label('lbl.checkoutPaymentUnavailable', 'Payment details unavailable. Please try again.'));return;}
    const methodKey = ({wallet: 'Wallet', card: 'Card', cash: 'Cash'} as any)[S.pay];
    if (!methodKey || !fees().pay[methodKey]) {toast(label('lbl.actionPaymentUnavailable', 'This payment method is no longer available. Choose another method.')); return;}
    if (S.pay === 'card' && !S.cards.length) {push('payments'); return;}
  }
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
const placingOrders = new Set<string | null>();
export async function placeOrder(helpPayMode?: 'share' | 'full') {
  const accountId = S.accountId;
  if (S.busy || placingOrders.has(accountId)) return;
  placingOrders.add(accountId);S.busy = 1;emit();
  try {await placeOrderWork(helpPayMode);}
  catch (error) {if (S.accountId === accountId) toast(friendlyError(error,label('lbl.checkoutRequestFailed', 'Could not confirm the order. Check your order history before trying again.')));}
  finally {placingOrders.delete(accountId);if(S.accountId === accountId){S.busy=0;emit();}}
}

async function placeOrderWork(helpPayMode?: 'share' | 'full') {
  const helpPay = helpPayMode === 'share' || helpPayMode === 'full';
  const helpPayUpfront = (n: number) => helpPayMode === 'share' ? Math.ceil(Math.round(n * 100) * 0.6) / 100 : 0;
  const accountId = S.accountId;
  const access = await refreshGoodiesAccess();
  if (S.accountId !== accountId) return;
  if (access.status === 'suspended' || access.status === 'banned') {toast(access.status === 'banned' ? label("lbl.cms.3282b7d2663b", "Your access to Goodies has been permanently restricted.") : label("lbl.cms.b66a41c46241", "Your access to Goodies is temporarily suspended.")); return;}
  // A first-delivery discount must be based on server-confirmed history,
  // not on an empty local cache during account initialization.
  if (!providerInfo.demo && contentHooks.fees?.().firstFree) {
    const {data: auth, error: authError} = await supabase.auth.getUser();
    if (S.accountId !== accountId) return;
    if (authError || !auth.user) {
      toast(label("lbl.cms.8b44a234e658", "Unable to verify first-delivery eligibility. Please retry checkout."));
      return;
    }
    const {count, error: historyError} = await supabase.from('goodies_orders')
      .select('id', {count: 'exact', head: true})
      .eq('customer_id', auth.user.id);
    if (S.accountId !== accountId) return;
    if (historyError || count == null) {
      S.firstOrderEligible = null;
      emit();
      toast(label("lbl.cms.8b44a234e658", "Unable to verify first-delivery eligibility. Please retry checkout."));
      return;
    }
    S.firstOrderEligible = count === 0;
    emit();
  }
  if (cartStoreIds().length > 1) {if(helpPay){toast(label("lbl.sharedPay.fd720ee2314f", "Help Pay requests must contain items from one store."));return;}return placeMultiOrder();}
  const t = totals(), st = t.st!;
  if (!S.cart.lines.length) {toast(label('lbl.actionCartEmpty', 'Your cart is empty')); return;}
  if (!providerInfo.demo) {
    if (!helpPay && !['cash', 'wallet', 'card'].includes(S.pay)) {toast(label('lbl.actionChoosePayment', 'Choose Wantiss Wallet, a saved card, or cash.')); S.cs = 2; emit(); return;}
    if (!helpPay && S.pay === 'card' && !S.cards.length) {toast(label('lbl.actionAddSavedCard', 'Add a saved card before checking out.')); push('payments'); return;}
    // The ID check result cannot be recorded yet, so age-restricted orders stay blocked in live mode.
    if (hasAlcohol()) {toast(label('lbl.actionAlcoholUnavailable', 'Alcohol orders are not available yet.')); return;}
  }
  if (S.sch && S.sch <= Date.now() + 2 * 60_000) { S.busy = 0; S.cs = 1; toast(label("lbl.cms.54a7210b0faf", "That scheduled time is too close or has passed. Please choose a later time.")); emit(); return; }
  if (!st.open && !(st.acceptScheduledOrders && S.sch > Date.now())) {toast(label('lbl.actionStoreClosedCheckout', '{store} is closed. Choose a future pickup or delivery time if scheduling is available.').replace('{store}', st.n)); S.cs = 1; emit(); return;}
  const bad = S.cart.lines.filter((l: any) => {if (l.byo) return !!hooks.bCheck && !!(hooks as any).lineBad && !!(hooks as any).lineBad(l); const i = IT[l.id]; return !i || i.oos || l.q > i.stock;});
  if (bad.length) {toast(label('lbl.actionLineUnavailable', '{item} {reason}').replace('{item}', bad[0].n).replace('{reason}', bad[0].byo ? (hooks as any).lineBad(bad[0]) : label('lbl.actionQuantityUnavailable', 'is no longer available in that quantity'))); reset('cart'); return;}
  if (t.sub < st.min) {toast(label('lbl.actionMinimumOrder', 'Minimum order is {amount}').replace('{amount}', money(st.min))); reset('cart'); return;}
  const pk = isPk(), a = addr();
  if (!pk && (!a || !a.t)) {toast(label('lbl.actionChooseAddress', 'Choose a delivery address')); S.cs = 0; emit(); return;}
  const ct = ctOf();
  if (!phoneOK(ct.ph)) {toast(label('lbl.actionValidPhone', 'Choose a valid contact number')); S.cs = 0; emit(); return;}
  // Refresh the wallet before doing delivery routing so an insufficient balance
  // is explained immediately instead of being masked by an unrelated quote error.
  const walletVerified = providerInfo.demo ? true : await refreshPaymentOptions();
  if (S.accountId !== accountId) return;
  if (!providerInfo.demo && (helpPay ? helpPayMode === 'share' : S.pay === 'wallet') && !walletVerified) {
    S.busy = 0; toast(label("lbl.cms.9e67ba6cf31c", "Could not verify your live Wantiss Wallet balance. Please retry before placing the order.")); emit(); return;
  }
  if (!providerInfo.demo && (helpPay ? helpPayMode === 'share' : S.pay === 'wallet') && !S.hasWallet) {
    S.busy = 0; S.cs = 2; toast(label('lbl.actionWalletUnavailable', 'Your Wantiss wallet is not available. Create a wallet or choose another payment method.')); emit(); return;
  }
  if (!providerInfo.demo && (helpPay ? helpPayMode === 'share' : S.pay === 'wallet') && S.wallet < (helpPay ? helpPayUpfront(t.total) : t.total)) {
    S.busy = 0; S.cs = 2; toast(label('lbl.actionWalletInsufficient', 'Insufficient Wantiss wallet balance. Add funds or choose a saved card or cash.')); emit(); return;
  }
  let deliveryQuoteId: string | null = null;
  if (!providerInfo.demo && !pk) {
    const pin = savedPoint(a);
    const addressPayload = {l: a.l, t: a.t, apt: a.apt, inst: a.inst, city: a.city, department: a.department, country: a.country, ...(pin ? {latitude: pin[0], longitude: pin[1]} : {})};
    const addressKey = JSON.stringify(addressPayload);
    let quote = (S as any).deliveryFeeQuote;
    const quoteIsCurrent = quote?.storeId === S.cart.sid && quote?.addressKey === addressKey && Number(quote?.expiresAt) > Date.now();
    if (!quoteIsCurrent) {
      const quoteResult = await supabase.functions.invoke('goodies-delivery-quote', {
        body: {store_id: S.cart.sid, address: addressPayload},
      });
      if (S.accountId !== accountId) return;
      if (quoteResult.error || !quoteResult.data?.quote_id) {
        let detail = quoteResult.data?.error || '';
        const response = quoteResult.error?.context;
        if (!detail && response && typeof response.clone === 'function') {
          try {
            const payload = await response.clone().json();
            detail = String(payload?.error || payload?.message || payload?.details || '');
          } catch {
            try { detail = String(await response.clone().text()).slice(0, 360); } catch { /* retain the SDK error */ }
          }
          if (!detail && Number(response.status) > 0) detail = label("lbl.sharedPay.12076fe48d8c", "Delivery quote failed (HTTP ") + response.status + label("lbl.page.actions.25b66787be", "). Check the delivery address and try again.");
        }
        S.busy = 0;
        let checkoutMessage = friendlyError(detail ? {message: detail} : quoteResult.error, label("lbl.cms.23eaba046138", "Could not calculate the road distance. Please check the delivery address."));
        if (S.pay === 'wallet') {
          const verified = await refreshPaymentOptions();
          if (verified && (!S.hasWallet || S.wallet < t.total)) {
            checkoutMessage = label('lbl.actionWalletInsufficient', 'Insufficient Wantiss wallet balance. Add funds or choose another payment method.');
          }
        }
        toast(checkoutMessage);
        emit();
        return;
      }
      quote = {
        quoteId: String(quoteResult.data.quote_id), fee: Number(quoteResult.data.fee),
        storeId: S.cart.sid, addressKey, expiresAt: Date.now() + 5 * 60 * 1000,
      };
      (S as any).deliveryFeeQuote = quote;
    }
    deliveryQuoteId = String(quote.quoteId);
    const oldFee = t.fee;
    const promoFree = !!(S.promo && pChk(S.promo, t.sub, S.cart.sid).p?.ty === 'ship');
    const firstFree = first() && !!contentHooks.fees?.().firstFree;
    const fee = (promoFree || firstFree) ? 0 : Number(quote.fee);
    t.fee = fee;
    t.total = Math.round((t.sub + t.fee + t.svc - t.disc + t.tip) * 100) / 100;
    if (Math.abs(oldFee - fee) > 0.005) {
      S.busy = 0;
      toast(label("lbl.cms.e37b9c50c397", "Your road-based delivery fee is now ") + money(fee) + label("lbl.cms.be7a6005669c", ". Review the updated total and place your order again."));
      emit();
      return;
    }
  }
  const walletVerifiedAfterQuote = providerInfo.demo ? true : await refreshPaymentOptions();
  if (S.accountId !== accountId) return;
  if (!providerInfo.demo && (helpPay ? helpPayMode === 'share' : S.pay === 'wallet') && !walletVerifiedAfterQuote) {
    S.busy = 0; toast(label("lbl.cms.9e67ba6cf31c", "Could not verify your live Wantiss Wallet balance. Please retry before placing the order.")); emit(); return;
  }
  if (!providerInfo.demo && (helpPay ? helpPayMode === 'share' : S.pay === 'wallet') && !S.hasWallet) {S.cs = 3; toast(label('lbl.actionWalletUnavailable', 'Your Wantiss wallet is not available. Create a wallet or choose another payment method.')); emit(); return;}
  if (!providerInfo.demo && (helpPay ? helpPayMode === 'share' : S.pay === 'wallet') && S.wallet < (helpPay ? helpPayUpfront(t.total) : t.total)) {S.cs = 3; toast(label('lbl.actionWalletInsufficient', 'Insufficient Wantiss wallet balance. Add funds or choose a saved card or cash.')); emit(); return;}
  const alc = hasAlcohol();
  if (alc && !S.alcConsent) {toast(label('lbl.actionConfirmAlcohol', 'Please confirm the alcohol rules to continue')); return;}
  if (alc && !S.hasWallet) {toast(label('lbl.actionCreateWalletAlcohol', 'Create your Wantiss wallet first. Refunds for alcohol orders go there.')); push('payments'); return;}
  if (S.promo && t.perr) {S.promo = ''; toast(label('lbl.actionPromoInvalid', 'Your promo code no longer applies. Totals updated')); emit(); return;}
  if (S.sch && S.sch < Date.now()) {S.sch = 0; S.cs = 1; toast(label('lbl.actionTimePassed', 'That time has passed. Pick another')); emit(); return;}
  if (providerInfo.demo && S.pay === 'wallet' && S.wallet < t.total) {toast(label('lbl.actionWalletLow', 'Wallet balance is too low. Top up or pick another method.')); push('payments'); return;}
  if (providerInfo.demo && S.pay === 'card') {
    if (!S.cards.length) {push('payments'); return;}
    if (S.cards[0].l4 === '0002') {toast(label('lbl.actionCardDeclinedDemo', 'Card declined (demo). Your cart is safe. Try another method.')); S.cs = 2; emit(); return;}
  }
  /* Demo orders are local; live wallet/card orders use authenticated server payment flows below. */
  S.busy = 1; emit();
  const selectedCard: any = S.cards.find((card: any) => card.id === S.selectedCardId) || S.cards.find((card: any) => card.isDefault) || S.cards[0];
  const pl: any = {wallet: 'Wallet', moncash: 'MonCash', card: label("lbl.page.actions.e7cb25f2ef", "Card •••• ") + (selectedCard ? selectedCard.l4 : ''), cash: 'Cash'}[S.pay as string];
  let id: string;
  do {id = label("lbl.sharedPay.884d5bff79c1", "GD") + Math.floor(1000 + Math.random() * 9000);} while (S.orders.some((x: any) => x.id === id));
  let backendOrderId: string | null = null;
  if (!providerInfo.demo) {
    // Live: the server validates the store, mode, schedule and totals, and assigns the order code.
    const r2 = (n: number) => Math.round(n * 100) / 100;
    const orderPayload = {
      p_store_id: S.cart.sid,
      p_order_type: pk ? 'pickup' : 'delivery',
      p_scheduled_for: S.sch && S.sch > Date.now() ? new Date(S.sch).toISOString() : null,
      p_address: pk ? null : {l: a.l, t: a.t, apt: a.apt, inst: a.inst, city: a.city, department: a.department, country: a.country, ...(savedPoint(a) ? {latitude: savedPoint(a)![0], longitude: savedPoint(a)![1]} : {}), ...(deliveryQuoteId ? {delivery_quote_id: deliveryQuoteId} : {})},
      p_contact_phone: ct.ph,
      p_items: S.cart.lines.map((l: any) => ({k: l.k, id: l.id, n: l.n, e: l.e, photo: l.photo || IT[l.id]?.photo || null, p: l.p, q: l.q, d: l.d, nt: l.nt, byo: l.byo, options: l.byo ? undefined : (l.options || (() => {const parts = String(l.k || '').split('|'); const category = STB[S.cart.sid!]?.c; return {size: CHOOSE_SIZE_CATS.includes(category) ? (parts[1] === '1' ? 'large' : 'regular') : null, drink: parts[2] === '1', discount_pct: Number(parts[3] || 0)};})())})),
      p_subtotal: r2(t.sub), p_delivery_fee: r2(t.fee), p_service_fee: r2(t.svc), p_discount: r2(t.disc), p_tip: r2(t.tip), p_total: r2(t.total),
      p_notes: String(S.note || '').trim() || null,
      p_promo_code: S.promo || null,
    };
    if (helpPay && helpPayMode) {
      const snapshotFingerprint = JSON.stringify({...orderPayload,payment_method:'help-pay',mode:helpPayMode});
      try {
        const attempt = await getGoodiesCheckoutAttempt(snapshotFingerprint);
        const {createHelpPayDraft} = await import('./helpPayApi');
        const requestId = await createHelpPayDraft(helpPayMode,Math.round(orderPayload.p_total*100),attempt.key,orderPayload);
        (S as any).helpPayRequestId=requestId;
        (S as any).helpPayRequestUserId=(await supabase.auth.getUser()).data.user?.id||null;
        S.busy=0;
        if (S.stack[S.stack.length-1]?.r !== 'help-pay') push('help-pay');
        await save();emit();
      } catch (error: any) {
        S.busy=0;emit();
        toast(friendlyError(error,'Could not create this Help Pay request. No payment has been confirmed.'));
      }
      return;
    }
    const fingerprintAddress = orderPayload.p_address
      ? Object.fromEntries(Object.entries(orderPayload.p_address).filter(([key]) => key !== 'delivery_quote_id'))
      : null;
    const fingerprint = JSON.stringify({...orderPayload, p_address: fingerprintAddress, p_payment_method: S.pay});
    let attempt: {key: string; fingerprint: string};
    try {
      attempt = await getGoodiesCheckoutAttempt(fingerprint);
    } catch (storageError: any) {
      S.busy = 0;
      toast(friendlyError(storageError, label("lbl.cms.cf80b4292197", "Could not securely save this checkout attempt. Please try again.")));
      emit();
      return;
    }
    if (S.accountId !== accountId) return;
    let data: any = null, error: any = null;
    if (S.pay === 'card') {
      const result = await supabase.functions.invoke('place-goodies-card-order', {
        body: { payment_method_id: (S.cards.find((card: any) => card.id === S.selectedCardId) || S.cards.find((card: any) => card.isDefault) || S.cards[0])?.id, idempotency_key: attempt.key, order: orderPayload },
      });
      data = result.data; error = result.error;
    } else {
      const result = await supabase.rpc('place_goodies_order_with_payment_once', {
        p_idempotency_key: attempt.key,
        p_payment_method: S.pay,
        ...orderPayload,
      });
      data = result.data; error = result.error;
    }
    if (S.accountId !== accountId) return;
    const row: any = Array.isArray(data) ? data[0] : data;
    if (error || !row?.id) {
      S.busy = 0;
      const detail = String(error?.message || data?.error || '');
      if (error || !row?.id) console.warn('Goodies checkout failed', {payment: S.pay, error, data});
      if (S.pay === 'wallet') {
        const verified = await refreshPaymentOptions();
        if (/insufficient|not enough|balance too low/i.test(detail) || (verified && (!S.hasWallet || S.wallet < t.total))) {
          toast(label('lbl.actionWalletInsufficient', 'Insufficient Wantiss wallet balance. Add funds or choose another payment method.'));
        } else {
          toast(friendlyError(detail ? {message: detail} : error, label("lbl.cms.827cc1f46abc", "Wantiss Wallet could not complete this payment. Your cart is still saved. Please retry or choose another payment method.")));
        }
      } else {
        toast(friendlyError(detail ? {message: detail} : error, label('lbl.actionPlaceOrderFailed', 'Could not place the order. Please try again.')));
      }
      emit(); return;
    }
    if (S.pay === 'card' && data?.requires_action && data?.client_secret && data?.publishable_key && data?.stripe_payment_method_id) {
      S.cardPending = {id: row.id, orderCode: row.order_code, status: row.status, clientSecret: data.client_secret, publishableKey: data.publishable_key, paymentMethodId: data.stripe_payment_method_id};
      S.busy = 0; push('cardauth'); emit(); return;
    }
    backendOrderId = row.id; id = row.order_code || id;
    if (S.pay === 'wallet') await refreshPaymentOptions();
  }
  if (S.accountId !== accountId) return;
  if (providerInfo.demo && S.pay === 'wallet') S.wallet -= t.total;
  const o = {
    id, backendId: backendOrderId, serverStatus: backendOrderId ? (S.sch && S.sch > Date.now() ? 'scheduled' : 'placed') : null, sid: S.cart.sid, lines: S.cart.lines.map((l: any) => ({k: l.k, id: l.id, n: l.n, e: l.e, photo: l.photo || IT[l.id]?.photo || null, p: l.p, q: l.q, d: l.d, nt: l.nt, byo: l.byo})),
    sn: st.n, sub: t.sub, fee: t.fee, svc: t.svc, disc: t.disc, tip: t.tip, total: t.total, t0: Date.now(), st: 0, rated: 0, cx: 0, pk,
    addr: pk ? st.n : a.t, ad: pk ? null : {l: a.l, t: a.t, apt: a.apt, inst: a.inst}, ph: ct.ph, phl: ct.w ? label("lbl.page.actions.cfb06d9224", "Wantiss number") : ct.l, cid: ct.id,
    pay: S.pay, payl: pl, note: String(S.note || '').trim(), sch: S.sch, promo: S.promo,
    alc: alc ? {...alcAge(S.cart.sid), who: pk ? 'shop' : 'courier', status: 'pending'} : null,
  };
  S.orders.unshift(o);
  S.cart = {sid: null, lines: []}; S.promo = ''; S.tip = 0; S.note = ''; S.sch = 0; S.cs = 0; S.cc = 'w'; S.alcConsent = false;
  if (!backendOrderId) S.notifs.unshift({id: Date.now() + Math.random(), t: label("lbl.sharedPay.d337d826db7e", "Order ") + o.id + label("lbl.sharedPay.1da621181d3d", " placed"), d: label("lbl.page.actions.9983301c3b", "Demo order sent to ") + st.n + label("lbl.page.actions.0e7f1cefe2", ". Tap to track it."), r: 'track', p: o.id, u: 1});
  S.stack = [{r: 'home', u: Date.now()}, {r: 'confirm', p: o.id, u: Date.now() + 1}];
  S.busy = 0; toast(backendOrderId ? label('lbl.actionOrderSent', 'Order sent to the store') : label('lbl.actionDemoOrderPlaced', 'Demo order placed!'));
  await save();
  if (backendOrderId) await completeGoodiesCheckoutAttempt(backendOrderId);
  emit();
  if (backendOrderId) void refreshLiveSchedules(); /* stock was reserved on the server */
}
export async function completeCardOrder() {
  const accountId = S.accountId;
  const pending = S.cardPending;
  if (!pending || S.busy) return;
  S.busy = 1; emit();
  try {
    const {data, error} = await supabase.functions.invoke('place-goodies-card-order', {body: {action: 'capture', order_id: pending.id}});
    if (S.accountId !== accountId) return;
    if (error || data?.error || !data?.success) throw error || new Error(data?.error || label("lbl.page.actions.ad7e8cd3a2", "Card payment could not be completed."));
    const t = totals(), st = t.st!, pk = isPk(), a = addr(), ct = ctOf(), alc = hasAlcohol();
    const selectedCard: any = S.cards.find((card: any) => card.id === S.selectedCardId) || S.cards.find((card: any) => card.isDefault) || S.cards[0];
    const o = {
      id: pending.orderCode, backendId: pending.id, serverStatus: pending.status || 'placed', sid: S.cart.sid,
      lines: S.cart.lines.map((l: any) => ({k: l.k, id: l.id, n: l.n, e: l.e, photo: l.photo || IT[l.id]?.photo || null, p: l.p, q: l.q, d: l.d, nt: l.nt, byo: l.byo})),
      sn: st.n, sub: t.sub, fee: t.fee, svc: t.svc, disc: t.disc, tip: t.tip, total: t.total, t0: Date.now(), st: 0, rated: 0, cx: 0, pk,
      addr: pk ? st.n : a.t, ad: pk ? null : {l: a.l, t: a.t, apt: a.apt, inst: a.inst}, ph: ct.ph, phl: ct.w ? label("lbl.page.actions.cfb06d9224", "Wantiss number") : ct.l, cid: ct.id,
      pay: 'card', payl: label("lbl.page.actions.e7cb25f2ef", "Card •••• ") + (selectedCard ? selectedCard.l4 : ''), note: String(S.note || '').trim(), sch: S.sch, promo: S.promo,
      alc: alc ? {...alcAge(S.cart.sid), who: pk ? 'shop' : 'courier', status: 'pending'} : null,
    };
    S.orders.unshift(o);
    S.cardPending = null; S.cart = {sid: null, lines: []}; S.promo = ''; S.tip = 0; S.note = ''; S.sch = 0; S.cs = 0; S.cc = 'w'; S.alcConsent = false;
    S.stack = [{r: 'home', u: Date.now()}, {r: 'confirm', p: o.id, u: Date.now() + 1}];
    S.busy = 0; toast(label('lbl.actionOrderSent', 'Order sent to the store')); await save();
    await completeGoodiesCheckoutAttempt(String(pending.id));
    emit();
    void refreshLiveSchedules();
  } catch (e: any) {
    S.busy = 0; toast(friendlyError(e, label("lbl.cms.52bdf65af3cd", "Card payment could not be completed. Your order has not been confirmed."))); emit();
  }
}

export async function cancelPendingCardOrder() {
  const accountId = S.accountId;
  const pending = S.cardPending;
  if (!pending) {navBack();return;}
  if (S.busy) return;
  S.busy = 1; emit();
  try {
    const {data, error} = await supabase.functions.invoke('place-goodies-card-order', {body: {action: 'cancel', order_id: pending.id}});
    if (S.accountId !== accountId) return;
    if (error || data?.error || !data?.success) throw error || new Error(data?.error || label("lbl.page.actions.7d44819659", "The card payment could not be cancelled yet."));
    S.cardPending = null;
    await completeGoodiesCheckoutAttempt(String(pending.id));
    navBack();
  } catch (e: any) {
    toast(friendlyError(e, label("lbl.cms.e096428eaf31", "The card payment could not be cancelled yet. Please retry.")));
  } finally {
    S.busy = 0; emit();
  }
}

export const cancelAsk = (id: string) => ui.sheet({kind: 'cancel', id});
export async function cancelOrder(id: string) {
  const o = S.orders.filter((x: any) => x.id === id)[0]; ui.close();
  if (!o || done(o) || o.st > 2) {toast(label('lbl.actionCannotCancel', 'This order can no longer be cancelled')); emit(); return;}
  if (o.backendId) {
    const {error} = await supabase.rpc('set_goodies_order_status', {p_order_id: o.backendId, p_status: 'cancelled'});
    if (error) {toast(friendlyError(error, label('lbl.actionCannotCancel', 'This order can no longer be cancelled'))); emit(); return;}
    if (o.pay === 'card') {
      const refund = await supabase.functions.invoke('refund-goodies-card-order', {body: {order_id: o.backendId}});
      if (refund.error || refund.data?.error) toast(label('lbl.actionRefundPending', 'Order cancelled. Your card refund is pending and may need support follow-up.'));
    }
  }
  o.cx = 1;
  if (providerInfo.demo && o.pay === 'wallet') S.wallet += o.total;
  else if (o.backendId && o.pay === 'wallet') await refreshPaymentOptions();
  if (providerInfo.demo) S.notifs.unshift({id: Date.now() + Math.random(), t: label("lbl.sharedPay.d337d826db7e", "Order ") + o.id + label("lbl.sharedPay.cd46246db8c2", " cancelled"), d: label("lbl.page.actions.c010aa83cd", "Your order was cancelled.") + (o.pay === 'wallet' ? label("lbl.page.actions.353a2b3bb1", " The total was refunded to your wallet.") : ''), r: 'track', p: o.id, u: 1});
  toast(label('lbl.actionOrderCancelled', 'Order cancelled')); save(); emit();
  if (o.backendId) void refreshLiveSchedules(); /* stock was restored on the server */
}
export function reorder(id: string) {
  const o = S.orders.filter((x: any) => x.id === id)[0]; if (!o) return;
  const r = reorderLines(o);
  if (!r.ok.length) {toast(r.miss.length ? label('lbl.actionReorderUnavailable', 'Those items are unavailable right now') : label('lbl.actionNothingToReorder', 'Nothing to reorder')); return;}
  const run = () => {S.cart = {sid: o.sid, lines: r.ok}; S.promo = ''; ui.close(); reset('cart'); toast(r.miss.length ? label('lbl.actionReorderPartial', 'Added available items. Unavailable: {items}').replace('{items}', r.miss.join(', ')) : label('lbl.actionReorderAdded', 'Items added to your cart'));};
  if (S.cart.sid && S.cart.sid !== o.sid && S.cart.lines.length) {S.ro = run; ui.sheet({kind: 'replace', from: STB[S.cart.sid].n});} else run();
}
export const runReorder = () => {if (S.ro) S.ro();};
export const setOrdersTab = (t: string) => {S.ot = t; emit();};
export function openNotif(id: any) {const n = S.notifs.filter((x: any) => x.id == id)[0]; if (!n) return; n.u = 0; push('ndetail', n.id);}
export const readAll = () => {S.notifs.forEach((n: any) => (n.u = 0)); emit();};
const preferenceSaving = new Set<string>();
export const togglePref = async (k: 'orders' | 'promos') => {
  if (preferenceSaving.has(k)) return;
  const account = S.accountId, enabled = !S.np[k];preferenceSaving.add(k);
  try {
    const {error} = await supabase.rpc('goodies_set_notification_preference', {p_kind: k, p_enabled: enabled});
    if (error) throw error;
    if (S.accountId !== account) return;
    S.np[k] = enabled ? 1 : 0;save();emit();
  } catch {toast(label('lbl.preferenceSaveFailed', 'Could not save notification preferences. Please try again.'));}
  finally {preferenceSaving.delete(k);}
};
export const selectAddr = async (id: string | number) => {
  if (!providerInfo.demo) {
    const {error} = await supabase.auth.updateUser({data: {goodies_default_address_id: String(id)}});
    if (error) { toast(friendlyError(error, label("lbl.cms.61e7d6d50f9b", "Could not update the Goodies delivery address."))); return; }
  }
  S.as = id; save(); ui.close(); emit();
  const selected = addr();
  toast(label('lbl.actionDeliveringTo', 'Delivering to {address} (Wantiss default unchanged)').replace('{address}', selected?.l || selected?.t || label('lbl.addressSelectedFallback', 'your selected address')));
};
export const setFilter = (k: string) => {S.f = k; emit();};
export const setSub = (k: string) => {S.sub = k; emit();};
export const clearFilters = () => {S.f = ''; S.sub = ''; emit();};

/* ---------- alcohol: rules, consent, ID check, refund ---------- */
export const setConsent = (v: boolean) => {S.alcConsent = v; emit();};
export function alcAccept() {S.alcAck = 1; const p = S.pend; ui.close(); if (p && p[0] && !p[2]) cartAdd(p[0], p[1]); else if (p && p[2]) p[2]();}
let paymentOptionsGeneration = 0;
export async function refreshPaymentOptions(): Promise<boolean> {
  const generation = ++paymentOptionsGeneration, owner = S.accountId;
  const current = () => generation === paymentOptionsGeneration && S.accountId === owner;
  S.paymentOptionsStatus = 'loading';emit();
  try {
    const {data: sessionData, error: sessionError} = await supabase.auth.getUser();
    if (sessionError || !sessionData.user || sessionData.user.id !== owner) throw new Error('Session unavailable');
    const userId = sessionData.user.id;
    const [walletResult, cardsResult] = await Promise.all([
      supabase.from('wallets').select('id,balance').eq('user_id', userId).maybeSingle(),
      supabase.rpc('get_my_payment_methods'),
    ]);
    if (!current()) return false;
    const balance = walletResult.data?.balance;
    if (walletResult.error || cardsResult.error || !Array.isArray(cardsResult.data) || (walletResult.data && (typeof walletResult.data.id !== 'string' || !walletResult.data.id || balance == null || String(balance).trim() === '' || !Number.isFinite(Number(balance))))) throw new Error('Payment details unavailable');
    S.hasWallet = !!walletResult.data?.id;
    S.wallet = walletResult.data ? Number(balance) : 0;
    S.cards = cardsResult.data.map((card: any) => ({
      id: card.id, b: String(card.brand || 'Card'), l4: String(card.last4 || ''),
      expiryMonth: card.expiry_month, expiryYear: card.expiry_year, isDefault: !!card.is_default,
    }));
    if (!S.cards.some((card: any) => card.id === S.selectedCardId)) S.selectedCardId = (S.cards.find((card: any) => card.isDefault) || S.cards[0])?.id || '';
    S.paymentOptionsStatus = 'ready';save();emit();
    return true;
  } catch {
    if (current()) {S.paymentOptionsStatus = 'error';emit();}
    return false;
  }
}

export async function createWallet() {
  try {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!auth.user) throw new Error(label("lbl.page.actions.66a268bc9d", "Sign in to create a Wantiss wallet."));
    const { error } = await supabase.rpc('ensure_my_wallet');
    if (error) throw error;
    const { data: wallet, error: verifyError } = await supabase.from('wallets')
      .select('id,balance').eq('user_id', auth.user.id).maybeSingle();
    if (verifyError) throw verifyError;
    if (!wallet?.id) throw new Error(label("lbl.page.actions.756aec8c65", "Wallet creation was not confirmed by the server. Please retry."));
    if (S.accountId !== auth.user.id) return;
    S.hasWallet = true;
    S.wallet = Number(wallet.balance || 0);
    await refreshPaymentOptions();
    toast(label('lbl.actionWalletReady', 'Wantiss wallet is ready'));
    emit();
  } catch (e: any) {
    toast(friendlyError(e, label('lbl.actionWalletCreateFailed', 'Could not create your Wantiss wallet. Please try again.')));
  }
}
/* DEMO ONLY: in production the courier app (delivery) or the Vendor Dashboard (pickup) records this result. */
export function idResult(id: string, ok: boolean) {
  require('./providers').assertDemoOnly('Simulated ID check');
  const o = S.orders.filter((x: any) => x.id === id)[0]; if (!o || !o.alc || o.alc.status !== 'pending') return;
  const F = require('./store').contentHooks.fees ? require('./store').contentHooks.fees() : {rfSvc: true, rfTip: true};
  if (ok) {o.alc.status = 'passed'; toast(label('lbl.actionIdPassed', 'ID checked. Order can be completed'));}
  else {
    o.alc.status = 'failed'; o.cx = 1; o.idFail = 1;
    const refund = Math.round((o.sub - o.disc + (F.rfSvc ? o.svc : 0) + (F.rfTip ? o.tip : 0)) * 100) / 100;
    o.refund = o.pay === 'cash' ? 0 : refund;
    if (o.pay !== 'cash') S.wallet += refund;
    S.notifs.unshift({id: Date.now() + Math.random(), t: label("lbl.page.actions.0316618817", "ID check failed"), d: o.pay === 'cash' ? label("lbl.page.actions.56d63db38f", "The ID check failed, so the order was not handed over. You were not charged.") : money(refund) + label("lbl.page.actions.e13f05dc32", " was refunded to your Wantiss wallet. The delivery fee is not refunded."), r: 'track', p: o.id, u: 1});
    toast(label('lbl.actionIdFailed', 'ID check failed. Order cancelled'));
  }
  save(); emit();
}

/* ---------- several stores in one order ---------- */
const stopItems = (sid: string) => S.cart.lines.filter((l: any) => lineStore(l) === sid).map((l: any) => ({
  k: l.k, id: l.id, n: l.n, e: l.e, photo: l.photo || IT[l.id]?.photo || null, p: l.p, q: l.q, d: l.d, nt: l.nt, byo: l.byo,
  options: l.byo ? undefined : (l.options || (() => {const parts = String(l.k || '').split('|'); const category = STB[sid]?.c; return {size: CHOOSE_SIZE_CATS.includes(category) ? (parts[1] === '1' ? 'large' : 'regular') : null, drink: parts[2] === '1', discount_pct: Number(parts[3] || 0)};})()),
}));
async function placeMultiOrder() {
  const accountId = S.accountId;
  const ids = cartStoreIds();
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const stop = (message: string, step?: number) => {S.busy = 0; if (step != null) S.cs = step; toast(message); emit();};
  if (providerInfo.demo) return stop(label("lbl.page.actions.d2c68bb213", "Ordering from several stores needs a live connection."));
  if (ids.length > maxStops()) return stop(label("lbl.page.actions.737e259f91", "You can order from up to ") + maxStops() + label("lbl.page.actions.78645fb5f6", " stores at once."));
  if (isPk()) return stop(label("lbl.cms.bcfa3aa2ef5b", "Ordering from several stores is available for delivery only."));
  if (!['wallet', 'cash'].includes(S.pay)) return stop(label("lbl.page.actions.0e483440c6", "Choose Wantiss Wallet or cash to order from several stores."), 2);
  if (S.pay === 'cash') {
    const checks = await Promise.all(ids.map(async sid => {
      const {data, error} = await supabase.rpc('goodies_cash_on_delivery_available', {p_store_id: sid});
      return {sid, available: !error && data === true};
    }));
    const unavailable = checks.find(result => !result.available);
    if (unavailable) return stop((STB[unavailable.sid]?.n || label("lbl.page.actions.cf161ce31c", "A store")) + label("lbl.page.actions.672fe60e14", ": cash on delivery is not currently available. Choose Wantiss Wallet or try again later."), 2);
  }
  if (hasAlcohol()) return stop(label('lbl.actionAlcoholUnavailable', "Alcohol orders are not available yet."));
  if (S.sch && S.sch <= Date.now() + 2 * 60_000) return stop(label("lbl.cms.54a7210b0faf", "That scheduled time is too close or has passed. Please choose a later time."), 1);
  for (const sid of ids) {
    const s = STB[sid];
    if (!s?.live) return stop(label("lbl.page.actions.0e98e7865b", "One of the stores is no longer taking orders."));
    if (!s.open && !(s.acceptScheduledOrders && S.sch > Date.now())) return stop(label('lbl.actionStoreClosedCheckout', '{store} is closed. Choose a future pickup or delivery time if scheduling is available.').replace('{store}', s.n), 1);
    if (storeSub(sid) < s.min) {toast(s.n + ': ' + label('lbl.actionMinimumOrder', 'Minimum order is {amount}').replace('{amount}', money(s.min))); reset('cart'); return;}
  }
  const bad = S.cart.lines.filter((l: any) => {if (l.byo) return !!(hooks as any).lineBad && !!(hooks as any).lineBad(l); const i = IT[l.id]; return !i || i.oos || l.q > i.stock;});
  if (bad.length) {toast(label('lbl.actionLineUnavailable', '{item} {reason}').replace('{item}', bad[0].n).replace('{reason}', bad[0].byo ? (hooks as any).lineBad(bad[0]) : label('lbl.actionQuantityUnavailable', 'is no longer available in that quantity'))); reset('cart'); return;}
  const a = addr();
  if (!a || !a.t) return stop(label('lbl.actionChooseAddress', 'Choose a delivery address'), 0);
  const ct = ctOf();
  if (!phoneOK(ct.ph)) return stop(label('lbl.actionValidPhone', 'Choose a valid contact number'), 0);
  const t = totals();
  if (S.pay === 'wallet') {
    const verified = await refreshPaymentOptions();
    if (!verified) return stop(label("lbl.cms.9e67ba6cf31c", "Could not verify your live Wantiss Wallet balance. Please retry before placing the order."));
    if (!S.hasWallet) return stop(label('lbl.actionWalletUnavailable', 'Your Wantiss wallet is not available. Create a wallet or choose another payment method.'), 2);
  }
  /* One road quote covers every store; each store gets its own share, so the shares add up to the single fee shown. */
  const pin = savedPoint(a);
  const addressPayload = {l: a.l, t: a.t, apt: a.apt, inst: a.inst, city: a.city, department: a.department, country: a.country, ...(pin ? {latitude: pin[0], longitude: pin[1]} : {})};
  const addressKey = JSON.stringify(addressPayload), storeKey = ids.join(',');
  let mq = (S as any).deliveryFeeQuote;
  if (!(mq?.multi && mq.storeKey === storeKey && mq.addressKey === addressKey && Number(mq.expiresAt) > Date.now())) {
    S.busy = 1; emit();
    const quoteResult = await supabase.functions.invoke('goodies-delivery-quote', {body: {store_ids: ids, address: addressPayload}});
    const quotes = Array.isArray(quoteResult.data?.quotes) ? quoteResult.data.quotes : [];
    if (quoteResult.error || quotes.length !== ids.length) {
      let detail = quoteResult.data?.error || '';
      const response = quoteResult.error?.context;
      if (!detail && response && typeof response.clone === 'function') {try {const payload = await response.clone().json(); detail = String(payload?.error || payload?.message || '');} catch { /* keep the generic message */ }}
      return stop(friendlyError(detail ? {message: detail} : quoteResult.error, label("lbl.cms.b054edffa0ed", "Could not calculate the delivery fee. Please check the delivery address.")));
    }
    const perStore: Record<string, {id: string; fee: number}> = {};
    quotes.forEach((q: any) => {perStore[String(q.store_id)] = {id: String(q.id), fee: Number(q.fee)};});
    mq = {multi: true, storeKey, addressId: S.as, addressKey, fee: Number(quoteResult.data.delivery_fee), perStore, expiresAt: Date.now() + 5 * 60 * 1000};
    (S as any).deliveryFeeQuote = mq;
  }
  const freeFirst = first() && !!contentHooks.fees?.().firstFree;
  const stopFee = (sid: string) => freeFirst ? 0 : r2(Number(mq.perStore[sid]?.fee || 0));
  const newFee = r2(ids.reduce((sum: number, sid: string) => sum + stopFee(sid), 0));
  if (Math.abs(t.fee - newFee) > 0.005) {S.busy = 0; toast(label("lbl.cms.7539f83987cf", "Your delivery fee is now ") + money(newFee) + label("lbl.cms.be7a6005669c", ". Review the updated total and place your order again.")); emit(); return;}
  const total = r2(t.sub + newFee + t.svc + t.tip);
  if (S.pay === 'wallet' && S.wallet < total) return stop(label('lbl.actionWalletInsufficient', 'Insufficient Wantiss wallet balance. Add funds or choose another payment method.'), 2);
  const stops = ids.map((sid: string) => ({store_id: sid, items: stopItems(sid), subtotal: r2(storeSub(sid)), delivery_fee: stopFee(sid), delivery_quote_id: mq.perStore[sid]?.id}));
  const payload = {
    p_payment_method: S.pay, p_order_type: 'delivery',
    p_scheduled_for: S.sch && S.sch > Date.now() ? new Date(S.sch).toISOString() : null,
    p_address: addressPayload, p_contact_phone: ct.ph, p_stops: stops,
    p_service_fee: r2(t.svc), p_tip: r2(t.tip), p_notes: String(S.note || '').trim() || null,
  };
  S.busy = 1; emit();
  let attempt: {key: string; fingerprint: string};
  try {attempt = await getGoodiesCheckoutAttempt(JSON.stringify({...payload, p_address: {...addressPayload}, multi: true}));}
  catch (storageError: any) {return stop(friendlyError(storageError, label("lbl.cms.cf80b4292197", "Could not securely save this checkout attempt. Please try again.")));}
  if (S.accountId !== accountId) return;
  const {data, error} = await supabase.rpc('goodies_place_multi_order', {p_idempotency_key: attempt.key, ...payload});
  if (S.accountId !== accountId) return;
  const rows: any[] = Array.isArray(data) ? data : [];
  if (error || rows.length !== ids.length) {
    console.warn('Multi-store checkout failed', {error, rows});
    const detail = String(error?.message || '');
    if (S.pay === 'wallet') {
      const verified = await refreshPaymentOptions();
      if (/insufficient|not enough|balance too low/i.test(detail) || (verified && S.wallet < total)) return stop(label('lbl.actionWalletInsufficient', 'Insufficient Wantiss wallet balance. Add funds or choose another payment method.'));
    }
    return stop(friendlyError(detail ? {message: detail} : error, label("lbl.cms.1005cd459f19", "Could not place the order. Please try again.")));
  }
  if (S.pay === 'wallet') await refreshPaymentOptions();
  if (S.accountId !== accountId) return;
  const pl = S.pay === 'wallet' ? label("lbl.page.actions.d1c9a01d57", "Wallet") : label("lbl.page.actions.e2da108f63", "Cash");
  const orders = rows.sort((x, y) => Number(x.stop_index) - Number(y.stop_index)).map((row: any, index: number) => {
    const sid = String(row.store_id), st = STB[sid], first1 = index === 0;
    const sub = r2(storeSub(sid)), fee = stopFee(sid), svc = first1 ? r2(t.svc) : 0, tip = first1 ? r2(t.tip) : 0;
    return {
      id: row.order_code, backendId: row.order_id, parentId: row.group_id, stop: Number(row.stop_index),
      serverStatus: String(row.status || 'placed'), sid, lines: stopItems(sid).map((l: any) => ({k: l.k, id: l.id, n: l.n, e: l.e, photo: l.photo, p: l.p, q: l.q, d: l.d, nt: l.nt, byo: l.byo})),
      sn: st?.n || 'Store', sub, fee, svc, disc: 0, tip, total: r2(sub + fee + svc + tip), t0: Date.now(), st: 0, rated: 0, cx: 0, pk: false,
      addr: a.t, ad: {l: a.l, t: a.t, apt: a.apt, inst: a.inst}, ph: ct.ph, phl: ct.w ? label("lbl.page.actions.cfb06d9224", "Wantiss number") : ct.l, cid: ct.id,
      pay: S.pay, payl: pl, note: String(S.note || '').trim(), sch: S.sch, promo: '', alc: null,
    };
  });
  [...orders].reverse().forEach(o => S.orders.unshift(o));
  S.cart = {sid: null, lines: []}; S.promo = ''; S.tip = 0; S.note = ''; S.sch = 0; S.cs = 0; S.cc = 'w'; S.alcConsent = false;
  (S as any).deliveryFeeQuote = null;
  S.stack = [{r: 'home', u: Date.now()}, {r: 'confirm', p: orders[0].id, u: Date.now() + 1}];
  S.busy = 0; toast(label("lbl.cms.22a3716db5c9", "Your order was sent to ") + orders.length + label("lbl.cms.76eb531be72f", " stores"));
  await save();
  await completeGoodiesCheckoutAttempt(String(orders[0].backendId));
  emit();
  void refreshLiveSchedules();
}
