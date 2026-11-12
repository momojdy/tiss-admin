/** Restore owned shopping snapshots without treating a missing live catalog as deletion. */
export function recoverShoppingSnapshots(state: any, items: Record<string, any>, stores: Record<string, any>, unavailableStore: (id: string, name: string) => any) {
  const original = state.cart;
  const lines = Array.isArray(original?.lines) ? original.lines.filter((line: any) => line && typeof line.id === 'string' && line.id && typeof line.k === 'string' && Number.isSafeInteger(line.q) && line.q > 0 && typeof line.p === 'number' && Number.isFinite(line.p) && line.p >= 0) : [];
  const selected = typeof original?.sid === 'string' ? original.sid : '';
  const storeOf = (line: any) => line.s || line.byo?.sid || items[line.id]?.s || selected;
  const ids = [...new Set<string>(lines.map(storeOf).filter((id: any) => typeof id === 'string' && !!id))];
  state.cart = {...original, lines, sid: lines.length ? ids.includes(selected) ? selected : ids[0] || null : null};
  state.orders = (Array.isArray(state.orders) ? state.orders : []).filter((order: any) => order && typeof order.sid === 'string' && Array.isArray(order.lines));
  const ensure = (id: string, name: string) => {
    if (id && !Object.hasOwn(stores, id)) Object.defineProperty(stores, id, {value: unavailableStore(id, name), enumerable: true, configurable: true, writable: true});
  };
  ids.forEach(id => ensure(id, ''));
  state.orders.forEach((order: any) => ensure(order.sid, order.sn || ''));
  // An empty or unavailable cart is not proof that a pending checkout completed.
  // Only the explicit server-order confirmation path completes that attempt.
  for (const key of ['fav', 'favp']) state[key] = (Array.isArray(state[key]) ? state[key] : []).filter((id: any) => typeof id === 'string' && !!id);
}
