/** Cache ownership is a local privacy boundary, never server authorization. */
export function ownedCache(raw: any, ownerId: string | null): Record<string, any> | null {
  // Legacy caches have no provable owner and must not hydrate private account data.
  if (!raw || raw.ownerId !== ownerId || !raw.data || typeof raw.data !== 'object' || Array.isArray(raw.data)) return null;
  return raw.data;
}
export function cacheEnvelope(ownerId: string | null, data: Record<string, any>) {
  return {ownerId, data};
}
