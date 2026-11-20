/** Pure tracking rules shared by the map and regression tests. */
export type Coordinate = {latitude: number; longitude: number};
export const GPS_MAX_AGE_MS = 120_000;
// A received device fix must be recent when sent to the server. The customer
// map may retain the last genuinely recorded fix for longer while GPS is lost.
export const GPS_SAMPLE_MAX_AGE_MS = 30_000;

export function coordinate(value: any): Coordinate | null {
  const numeric = (part: unknown) => typeof part === 'number'
    || (typeof part === 'string' && part.trim() !== '');
  if (!numeric(value?.latitude) || !numeric(value?.longitude)) return null;
  const latitude = Number(value.latitude), longitude = Number(value.longitude);
  return Number.isFinite(latitude) && Math.abs(latitude) <= 90 && Number.isFinite(longitude) && Math.abs(longitude) <= 180
    ? {latitude, longitude} : null;
}

export function courierLocation(assignment: any, now = Date.now()): (Coordinate & {updatedAt: string}) | null {
  if (!['accepted', 'picked_up'].includes(assignment?.status)) return null;
  const point = coordinate(assignment);
  const timestamp = Date.parse(assignment?.location_updated_at || '');
  const age = now - timestamp;
  // Future timestamps must not keep a marker alive indefinitely.
  if (!point || !Number.isFinite(timestamp) || age < -30_000 || age > GPS_MAX_AGE_MS) return null;
  return {...point, updatedAt: assignment.location_updated_at};
}

export function freshGpsSample(sample: any, now = Date.now()): boolean {
  const timestamp = sample?.timestamp;
  return typeof timestamp === 'number' && Number.isFinite(timestamp)
    && now - timestamp >= -30_000 && now - timestamp <= GPS_SAMPLE_MAX_AGE_MS
    && !!coordinate(sample?.coords);
}

export function routeSegments(geometry: any): Coordinate[][] {
  const lines = geometry?.type === 'LineString' ? [geometry.coordinates]
    : geometry?.type === 'MultiLineString' ? geometry.coordinates : [];
  if (!Array.isArray(lines)) return [];
  return lines.flatMap((line: any) => {
    if (!Array.isArray(line) || line.length < 2) return [];
    const points = line.map((point: any) => Array.isArray(point) && point.length >= 2
      ? coordinate({latitude: point[1], longitude: point[0]}) : null);
    // Do not connect across invalid points or disconnected geometry segments.
    return points.every(Boolean) ? [points as Coordinate[]] : [];
  });
}

export function trackingRegion(points: any[]) {
  const valid = points.map(coordinate).filter((point): point is Coordinate => !!point);
  if (!valid.length) return null;
  let south=90,north=-90,west=180,east=-180;
  for(const point of valid){south=Math.min(south,point.latitude);north=Math.max(north,point.latitude);west=Math.min(west,point.longitude);east=Math.max(east,point.longitude);}
  return {latitude: (south + north) / 2, longitude: (west + east) / 2,
    latitudeDelta: Math.max(0.01, (north - south) * 1.3), longitudeDelta: Math.max(0.01, (east - west) * 1.3)};
}
