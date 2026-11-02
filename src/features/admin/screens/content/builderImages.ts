import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { createAssetUploadId, listCmsAssets, publishCmsAsset, uploadCmsAsset } from '../../lib/adminBackend';

const BUCKET = 'wantiss-cms-assets';
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** Short-lived preview links for uploaded pictures, looked up by asset key. */
export async function signedUrlsForKeys(keys: string[]): Promise<Record<string, string>> {
  if (!keys.length) return {};
  const assets: any[] = await listCmsAssets();
  const byKey = new Map<string, any>();
  assets.filter((a) => a.status !== 'archived').forEach((a) => {
    const current = byKey.get(a.asset_key);
    if (!current || (current.status !== 'published' && a.status === 'published')) byKey.set(a.asset_key, a);
  });
  const wanted = keys.map((k) => byKey.get(k)).filter(Boolean);
  if (!wanted.length) return {};
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(wanted.map((a) => a.storage_path), 3600);
  const urlByPath = new Map<string, string>();
  (data || []).forEach((d: any) => { if (d?.path && d?.signedUrl) urlByPath.set(d.path, d.signedUrl); });
  const out: Record<string, string> = {};
  wanted.forEach((a) => { const url = urlByPath.get(a.storage_path); if (url) out[a.asset_key] = url; });
  return out;
}

/** Pick a photo (Photos / Live Photos) or a file, upload it and publish it. Returns the asset key, or null if cancelled. */
export async function chooseAndUploadIngredientImage(source: 'photos' | 'files', itemId: string): Promise<string | null> {
  let uri = '', fileName = itemId + '-ingredient', contentType = 'image/jpeg', byteSize = 0;
  if (source === 'photos') {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.9 });
    if (result.canceled || !result.assets?.[0]) return null;
    const file = result.assets[0]; uri = file.uri; fileName = file.fileName || fileName; contentType = file.mimeType || contentType; byteSize = file.fileSize || 0;
  } else {
    const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', multiple: false, copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return null;
    const file = result.assets[0]; uri = file.uri; fileName = file.name || fileName; contentType = file.mimeType || contentType; byteSize = file.size || 0;
  }
  if (!byteSize) {
    const response = await fetch(uri);
    if (!response.ok) throw new Error('The selected image could not be read. Choose another image.');
    byteSize = (await response.blob()).size;
  }
  if (!TYPES.includes(contentType)) throw new Error('Choose a JPEG, PNG, WebP, or GIF image. Export HEIC/HEIF photos as JPEG first.');
  if (!byteSize) throw new Error('The selected image size could not be read.');
  const key = 'wantiss.goodies.byo.' + itemId + '.' + createAssetUploadId();
  const id = await uploadCmsAsset({ key, uri, fileName, contentType, byteSize, altText: { en: 'Build Your Own ingredient picture' }, status: 'draft' });
  // Builder changes go straight to customers, so the picture is published right away.
  await publishCmsAsset(id);
  return key;
}
