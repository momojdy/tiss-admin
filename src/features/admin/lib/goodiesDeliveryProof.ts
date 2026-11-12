import {supabase} from './supabase';

export const GOODIES_DELIVERY_PROOF_BUCKET = 'goodies-delivery-proofs';
export async function resolveGoodiesDeliveryProof(reference: string): Promise<string> {
  if (!reference) return '';
  // Legacy evidence remains readable during migration; never load arbitrary URLs.
  const legacy = 'https://ycbirmgppwavorwudlrv.supabase.co/storage/v1/object/public/listing-photos/';
  if (reference.startsWith(legacy) && !/[?#]/.test(reference)) return reference;
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(reference)) throw new Error('Invalid delivery photo reference.');
  const {data, error} = await supabase.storage.from(GOODIES_DELIVERY_PROOF_BUCKET).createSignedUrl(reference, 300);
  if (error || !data?.signedUrl) throw error || new Error('Delivery photo unavailable.');
  return data.signedUrl;
}
