// Published Home page content (CMS key "wantiss.home").
// Every field is optional: anything missing or blank falls back to the built-in default below, so an empty CMS never changes the screen.
// Keep this file identical to src/features/admin/lib/wantissHomeContent.ts in the tiss-admin repo.

export const HOME_CONTENT_KEY = 'wantiss.home';

export const HOME_CATEGORIES = [
  'Goodies', 'Woulib', 'Services', 'Globiz', 'Konsoliss', 'Stays', 'Flyz', 'Habita', 'Rideza', 'Frenzies',
  'Arts & Lits', 'Streamz', 'Gatherz', 'Glowz', 'Prezo', 'Top Up', 'Deals', 'Bidz', 'Lutz', 'More',
] as const;

export const homeCategorySlug = (label: string) =>
  label.toLowerCase().replace(/&/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

export type HomeCopy = Record<string, string>;
export type HomeContent = { copy: HomeCopy; images: Record<string, string> };

const base: HomeCopy = {
  tab_favs: 'Favs', tab_for_you: 'For you', tab_flash: 'Flash', tab_locals: 'Locals', tab_new_arrivals: 'New Arrivals', tab_live: 'Live',
  categories_label: 'Categories...',
  slogan_1: 'Buy Happiness', slogan_2: 'Wantiss', slogan_3: 'Sell Joy',
  search_button: 'search',
  featured_label: 'featured picks', featured_caption_1: 'from $9', featured_caption_2: 'from $15', featured_caption_3: 'from $6',
  flash_label: 'flash deals', flash_caption_1: 'up to $10 off', flash_caption_2: 'up to $20 off', flash_caption_3: 'up to $5 off',
  voucher_amount: '$7', voucher_text: 'grocery voucher',
  banner_caption_1: '$51.9 off', banner_caption_2: '$10.5 off', banner_caption_3: '$43.9 off',
  banner_image_1_asset_key: '', banner_image_2_asset_key: '', banner_image_3_asset_key: '',
  notice_1: 'new season styles, up to 20% off', notice_2: 'free shipping on orders over $50', notice_3: 'limited time: buy 1 get 1 half off',
  popup_enabled: 'true', popup_badge: 'promo',
  popup_message_1: 'spend $80, save $10 — claim now', popup_message_2: 'free delivery on your next order', popup_message_3: 'new members get 15% off today',
  nav_showcase: 'Showcase', nav_messages: 'Messages', nav_cart: 'Cart', nav_me: 'Me',
  logo_asset_key: '',
};

export const DEFAULT_HOME_COPY: HomeCopy = { ...base };
HOME_CATEGORIES.forEach((label) => {
  DEFAULT_HOME_COPY['cat_' + homeCategorySlug(label)] = label;
  DEFAULT_HOME_COPY['cat_' + homeCategorySlug(label) + '_asset_key'] = '';
});

export const DEFAULT_HOME_CONTENT: HomeContent = { copy: DEFAULT_HOME_COPY, images: {} };

/** Overlays a published payload on the defaults. Blank text and unknown keys are ignored. */
export function mergeHomeCopy(payload: unknown): HomeCopy {
  const copy: HomeCopy = { ...DEFAULT_HOME_COPY };
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return copy;
  const source = payload as Record<string, unknown>;
  Object.keys(DEFAULT_HOME_COPY).forEach((key) => {
    const value = source[key];
    if (typeof value !== 'string') return;
    const text = value.trim();
    if (key.endsWith('_asset_key')) { copy[key] = text; return; }
    if (key === 'popup_enabled') { if (text === 'true' || text === 'false') copy[key] = text; return; }
    if (text) copy[key] = text;
  });
  return copy;
}

/** Maps each *_asset_key field to the signed URL of its published asset. Fields without a published asset keep the built-in image. */
export function resolveHomeImages(copy: HomeCopy, assets: { asset_key: string; url: string }[]): Record<string, string> {
  const images: Record<string, string> = {};
  Object.keys(copy).forEach((field) => {
    if (!field.endsWith('_asset_key') || !copy[field]) return;
    const asset = assets.find((item) => item.asset_key === copy[field]);
    if (asset?.url) images[field] = asset.url;
  });
  return images;
}

type PublishedRecord = { content_key: string; version: number; payload: Record<string, unknown> };

/** Picks the newest published "wantiss.home" record. `found` is false when none is published (defaults apply). */
export function buildHomeContent(records: PublishedRecord[], assets: { asset_key: string; url: string }[]): { content: HomeContent; found: boolean } {
  const latest = records.filter((item) => item.content_key === HOME_CONTENT_KEY).sort((a, b) => b.version - a.version)[0];
  if (!latest) return { content: DEFAULT_HOME_CONTENT, found: false };
  const copy = mergeHomeCopy(latest.payload);
  return { content: { copy, images: resolveHomeImages(copy, assets) }, found: true };
}
