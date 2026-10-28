/* Goodies draft validation and safe asset handling; confirm the v5 schema against the original Admin export. */
import {CATS} from './data/seed';
import {t as tr} from './i18n';

export const GOODIES_CONTENT_KEY = 'goodies.content';
export const IMAGE_LISTS = ['modes', 'promos', 'cats', 'lib'] as const;
const REQUIRED_ARRAYS = ['cats', 'promos', 'modes', 'labels', 'deals', 'coupons', 'stages', 'lib', 'ages'];

/** Supabase signed URLs are temporary and must never be stored in content. */
export const isSignedUrl = (value: unknown): boolean =>
  typeof value === 'string' && (value.indexOf('/storage/v1/object/sign/') > -1 || /[?&]token=/.test(value));

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

/** Key-order independent JSON, so a jsonb round trip compares equal. */
export function stable(value: any): string {
  const walk = (v: any): any => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.keys(v).sort().reduce((out: any, k) => { out[k] = walk(v[k]); return out; }, {});
    return v;
  };
  return JSON.stringify(walk(value));
}

/** The image object of an entry: categories use `art`, everything else `img`. */
export const imageKeyFor = (list: string) => (list === 'cats' ? 'art' : 'img');

export function validateGoodiesDraft(draft: any): string[] {
  const errors: string[] = [];
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) return ['The Goodies content must be an object.'];
  if (draft.v !== 5) errors.push('The Goodies content must be version 5.');
  REQUIRED_ARRAYS.forEach((key) => { if (!Array.isArray(draft[key])) errors.push('Missing list: ' + key + '.'); });
  if (typeof draft.ageDef !== 'number') errors.push('Missing default minimum age (ageDef).');
  (['modes', 'promos', 'cats', 'labels'] as const).forEach((key) => {
    if (!Array.isArray(draft[key])) return;
    const seen = new Set<string>();
    draft[key].forEach((item: any, index: number) => {
      if (!item || typeof item.id !== 'string' || !item.id) { errors.push(key + ' item ' + (index + 1) + ' has no id.'); return; }
      if (seen.has(item.id)) errors.push('Duplicate id in ' + key + ': ' + item.id);
      seen.add(item.id);
    });
  });
  if (stable(draft).indexOf('/storage/v1/object/sign/') > -1) errors.push('The content contains a temporary signed URL. Use an asset key instead.');
  return errors;
}

/** Copy for saving: no render-only image data, no temporary URLs. */
export function sanitizeForSave(draft: any): any {
  const out = clone(draft);
  IMAGE_LISTS.forEach((list) => {
    (out[list] || []).forEach((item: any) => {
      ['img', 'art'].forEach((key) => {
        const image = item[key];
        if (!image || typeof image !== 'object') return;
        const assetKey = image.assetKey || image.asset_key;
        if (assetKey) { delete image.data; delete image.url; return; }
        if (isSignedUrl(image.data)) delete image.data;
        if (isSignedUrl(image.url)) delete image.url;
        /* A plain external link typed into the old editor lives in `data`; keep it as `url`. */
        if (typeof image.data === 'string' && /^https?:\/\//.test(image.data)) { image.url = image.data; delete image.data; }
      });
    });
  });
  return out;
}

/** Asset keys the draft depends on. */
export function referencedAssetKeys(draft: any): string[] {
  const keys = new Set<string>();
  IMAGE_LISTS.forEach((list) => {
    (draft?.[list] || []).forEach((item: any) => {
      ['img', 'art'].forEach((key) => {
        const k = item?.[key]?.assetKey || item?.[key]?.asset_key;
        if (k) keys.add(String(k));
      });
    });
  });
  return Array.from(keys);
}

/** Render-only copy: asset keys become short-lived URLs in `data`. The draft itself is never changed. */
export function resolveForRender(draft: any, urlByKey: Record<string, string>): any {
  const out = clone(draft);
  IMAGE_LISTS.forEach((list) => {
    (out[list] || []).forEach((item: any) => {
      ['img', 'art'].forEach((key) => {
        const image = item[key];
        if (!image || typeof image !== 'object') return;
        const assetKey = image.assetKey || image.asset_key;
        if (assetKey) { if (urlByKey[assetKey]) image.data = urlByKey[assetKey]; else delete image.data; }
        else if (image.url && !image.data) image.data = image.url;
      });
    });
  });
  return out;
}

const txt = (value: string) => ({en: {v: value, s: 'draft' as const}});

export function buildStarterDraft(): any {
  const modes = [
    {id: 'mode.food', st: 'Live', cat: 'restaurants', emoji: '🍛', title: txt(tr('foodDelivery')), sub: txt(tr('hotFresh')), img: null},
    {id: 'mode.groceries', st: 'Live', cat: 'groceries', emoji: '🛒', title: txt(tr('groceries')), sub: txt(''), img: null},
    {id: 'mode.drugstore', st: 'Live', cat: 'drugstore', emoji: '💊', title: txt(tr('drugstore')), sub: txt(''), img: null},
  ];
  const promos = [
    {id: 'promo.free-delivery', st: 'Live', ord: 1, color: 'plum', emoji: '🛵', aud: 'New customers', target: '', title: txt('Free delivery on your first order'), sub: txt('Welcome to Goodies. New here? It is on us.'), btn: txt('Order now'), img: null},
    {id: 'promo.double-points', st: 'Live', ord: 2, color: 'orange', emoji: '🎁', aud: 'All customers', target: '', title: txt('Earn double points this weekend'), sub: txt('Pay with Wallet on any order.'), btn: txt('Start earning'), img: null},
    {id: 'promo.fresh-produce', st: 'Live', ord: 3, color: 'green', emoji: '🥬', aud: 'All customers', target: '', title: txt('20% off fresh produce'), sub: txt('Straight from local farms and markets.'), btn: txt('Shop now'), img: null},
  ];
  const labelDefs: [string, string, string][] = [
    ['lbl.search', 'Search placeholder', tr('searchPh')],
    ['lbl.coupons', 'Coupons title', tr('couponsOffers')],
    ['lbl.coupons2', 'Coupons subtitle', tr('codesCheckout')],
    ['lbl.flash', 'Flash deals heading', tr('flashDeals')],
    ['lbl.again', 'Order again heading', tr('orderAgain')],
    ['lbl.recent', 'Recently viewed heading', tr('recentlyViewed')],
    ['lbl.popular', 'Popular vendors heading', tr('popularVendors')],
    ['lbl.produce', 'Fresh produce heading', tr('freshProduce')],
    ['lbl.haitian', 'Haitian specialties heading', tr('haitianSpecialties')],
    ['lbl.trending', 'Trending heading', tr('trending')],
  ];
  return {
    v: 5,
    modes,
    cats: CATS.map((c, i) => ({id: c.id, st: 'on', ord: i + 1, emoji: c.emoji, home: c.home, name: txt(String(c.name)), art: null})),
    promos,
    labels: labelDefs.map(([id, label, text]) => ({id, label, t: txt(text)})),
    deals: [],
    coupons: [],
    stages: [],
    lib: [],
    ages: [{cc: 'HT', age: 18}, {cc: 'DO', age: 18}],
    ageDef: 21,
  };
}
