import { supabase } from './supabase';

export interface PublishedContentRecord {
  id?: string;
  content_key: string;
  locale: string;
  version: number;
  payload: Record<string, unknown>;
  updated_at: string;
  status?: 'published';
  published_at?: string;
}
export interface PublishedAssetRecord {
  asset_key: string;
  url: string;
  content_type: string;
  byte_size: number;
  alt_text: Record<string, string>;
}
const brandingListeners = new Set<() => void>();
export const notifyBrandingChanged = () => brandingListeners.forEach((listener) => listener());
export const subscribeBrandingChanged = (listener: () => void) => {
  brandingListeners.add(listener);
  return () => { brandingListeners.delete(listener); };
};

export interface PublishedBranding { name: string; logo_url: string | null; wordmark_url: string | null; updated_at: string | null; }
export interface PublishedWantissContent {
  content: PublishedContentRecord[];
  assets: PublishedAssetRecord[];
  branding: PublishedBranding;
}

export async function fetchPublishedWantissContent(locale = 'en'): Promise<PublishedWantissContent> {
  try {
    const { data, error } = await supabase.functions.invoke('wantiss-public-content', { body: { locale } });
    if (error || !Array.isArray(data?.content) || !Array.isArray(data?.assets)) throw new Error();
    return {
      content: data.content,
      assets: data.assets,
      branding: data?.branding && typeof data.branding === 'object' ? data.branding as PublishedBranding : { name: 'Wantiss', logo_url: null, wordmark_url: null, updated_at: null },
    };
  } catch {
    throw new Error('Published content is unavailable right now.');
  }
}
