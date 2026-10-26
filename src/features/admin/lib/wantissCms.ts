import { supabase } from './supabase';

export interface PublishedContentRecord {
  id: string;
  content_key: string;
  locale: string;
  version: number;
  payload: Record<string, unknown>;
  status: 'published';
  published_at: string;
}
export interface PublishedAssetRecord {
  asset_key: string;
  url: string;
  content_type: string;
  byte_size: number;
  alt_text: Record<string, string>;
}
export interface PublishedWantissContent {
  content: PublishedContentRecord[];
  assets: PublishedAssetRecord[];
}

export async function fetchPublishedWantissContent(locale = 'en'): Promise<PublishedWantissContent> {
  const { data, error } = await supabase.functions.invoke('wantiss-public-content', { body: { locale } });
  if (error) throw new Error('Published content is unavailable right now.');
  return {
    content: Array.isArray(data?.content) ? data.content : [],
    assets: Array.isArray(data?.assets) ? data.assets : [],
  };
}
