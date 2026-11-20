/** Road routing is authoritative for Goodies distances; never replace it with a GPS straight line. */
export function roadDistanceKm(distanceMeters: unknown): number | null {
  if (typeof distanceMeters !== 'number' && typeof distanceMeters !== 'string') return null;
  if (String(distanceMeters).trim() === '') return null;
  const meters = Number(distanceMeters);
  return Number.isFinite(meters) && meters >= 0 ? meters / 1000 : null;
}
