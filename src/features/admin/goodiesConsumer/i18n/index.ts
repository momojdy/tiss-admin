/* Five-language support. PROPOSED model.
   - Interface strings: bundled key tables below (en is complete; other languages are machine DRAFTS until a human marks them reviewed).
   - Admin-managed content: Txt objects {en:{v,s}, fr:{...}, ...}, resolved by tx().
   Rules: selected language -> configured default (en). Haitian Creole is shown only when human reviewed.
   Machine drafts are never shown in production; the demo may show them so all five languages can be exercised. */
import {S} from '../store';
import type {LangCode, Txt} from '../data/types';
import {DICT} from './dict';

export const LANGS: {code: LangCode; label: string}[] = [
  {code: 'en', label: 'English'}, {code: 'fr', label: 'Français'}, {code: 'ht', label: 'Kreyòl ayisyen'}, {code: 'es', label: 'Español'}, {code: 'zh-Hans', label: '简体中文'},
];
export const DEFAULT_LANG: LangCode = 'en';
export const cfg = {showMachineDrafts: true /* demo: true, production: false */};

type Table = Record<string, string>;
const en: Table = {
  back: 'Back', home: 'Home', categories: 'Categories', orders: 'Orders', cart: 'Cart', search: 'Search', deliverTo: 'Deliver to',
  searchPh: 'Craving something? Search here', foodDelivery: 'Food delivery', hotFresh: 'Hot and fresh to you', groceries: 'Groceries', drugstore: 'Drugstore',
  couponsOffers: 'Coupons and offers', codesCheckout: 'Codes you can use at checkout', flashDeals: 'Flash deals', orderAgain: 'Order again', recentlyViewed: 'Recently viewed',
  popularVendors: 'Popular vendors', seeAll: 'See all', freshProduce: 'Fresh produce', haitianSpecialties: 'Haitian specialties', trending: 'Trending right now',
  restaurantsNear: 'Restaurants near you', yourCart: 'Your cart', viewCart: 'View cart', addToCart: 'Add to cart', checkout: 'Checkout', placeOrder: 'Place order',
  language: 'Language', settings: 'Settings', closed: 'Closed', soldOut: 'Sold out', freeDelivery: 'Free delivery', delivery: 'delivery', minOrder: 'Min. order',
};
const drafts: Record<string, Table> = {
  fr: {home: 'Accueil', categories: 'Catégories', orders: 'Commandes', cart: 'Panier', search: 'Rechercher', back: 'Retour', language: 'Langue', settings: 'Réglages', closed: 'Fermé', soldOut: 'Épuisé'},
  ht: {home: 'Akèy', categories: 'Kategori', orders: 'Kòmand', cart: 'Panye', search: 'Chèche', back: 'Retounen', language: 'Lang', settings: 'Paramèt', closed: 'Fèmen', soldOut: 'Fini'},
  es: {home: 'Inicio', categories: 'Categorías', orders: 'Pedidos', cart: 'Carrito', search: 'Buscar', back: 'Atrás', language: 'Idioma', settings: 'Ajustes', closed: 'Cerrado', soldOut: 'Agotado'},
  'zh-Hans': {home: '首页', categories: '分类', orders: '订单', cart: '购物车', search: '搜索', back: '返回', language: '语言', settings: '设置', closed: '已打烊', soldOut: '已售罄'},
};
/* languages whose bundled strings were human reviewed (production uses only these) */
export const REVIEWED: LangCode[] = ['en'];
const allowed = (l: string) => REVIEWED.includes(l as LangCode) || (cfg.showMachineDrafts && l !== 'ht') || (cfg.showMachineDrafts && l === 'ht'); /* demo may show drafts; production: REVIEWED only */

export function t(key: string, vars?: Record<string, string | number>): string {
  const l: string = S.lang || DEFAULT_LANG;
  let s: string | undefined = l !== 'en' && allowed(l) ? drafts[l]?.[key] : undefined;
  if (l === 'ht' && !REVIEWED.includes('ht') && !cfg.showMachineDrafts) s = undefined; /* Creole needs human review */
  s = s || en[key] || key;
  if (vars) Object.keys(vars).forEach(k => (s = (s as string).replace(new RegExp('\\{' + k + '\\}', 'g'), String(vars[k]))));
  return s as string;
}

/* admin-managed text with fallback. Never returns an empty string when English exists. */
export function tx(v: Txt | undefined | null): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  const l = (S.lang || DEFAULT_LANG) as LangCode, e = v[l];
  const ok = e && e.v && (e.s === 'reviewed' || (cfg.showMachineDrafts && l !== 'ht') || (cfg.showMachineDrafts && l === 'ht' && e.s !== 'missing'));
  if (l === 'ht' && e && e.s !== 'reviewed' && !cfg.showMachineDrafts) return v[DEFAULT_LANG]?.v || '';
  return ok ? (e as any).v : v[DEFAULT_LANG]?.v || '';
}

/* Broad coverage without editing every screen: <T> passes its text through here. Exact English match, otherwise unchanged. */
export function ts(s: string): string {
  const l: string = S.lang || DEFAULT_LANG;
  if (l === 'en') return s;
  const draftsOk = cfg.showMachineDrafts || REVIEWED.includes(l as LangCode);
  if (!draftsOk) return s;
  const e = DICT[s]; return (e && e[l]) || s;
}
