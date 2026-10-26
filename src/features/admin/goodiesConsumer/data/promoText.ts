/* Promo card detail sheets (v24 `promo` action). Admin-managed in production (Home content > Promo cards). */
export const PROMO_DETAIL = {
  free: {e: '🛵', t: 'Free delivery on your first order', d: 'Your first Goodies order ships free from any store. It is applied automatically at checkout.', b: 'Order now', go: 'restaurants', bg: '#F7D0DA'},
  points: {e: '🎁', t: 'Earn double points this weekend', d: 'Pay with your Wantiss Wallet on any order this weekend and earn 2× points.', b: 'Start earning', go: 'all', bg: '#FFD9B8'},
  produce: {e: '🥬', t: '20% off fresh produce', d: 'Fresh from local farms and markets.', b: 'Shop produce', go: 'produce', bg: '#D8F0CF'},
} as const;
