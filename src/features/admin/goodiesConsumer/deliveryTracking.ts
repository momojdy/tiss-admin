/** Pure tracking rules shared by the map and regression tests. */
export type Coordinate = {latitude: number; longitude: number};
export const GPS_MAX_AGE_MS = 120_000;

export function coordinate(value: any): Coordinate | null {
  if (value?.latitude == null || value?.longitude == null || value.latitude === '' || value.longitude === '') return null;
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
    && now - timestamp >= -30_000 && now - timestamp <= GPS_MAX_AGE_MS
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
  const latitudes = valid.map(point => point.latitude), longitudes = valid.map(point => point.longitude);
  const south = Math.min(...latitudes), north = Math.max(...latitudes);
  const west = Math.min(...longitudes), east = Math.max(...longitudes);
  return {latitude: (south + north) / 2, longitude: (west + east) / 2,
    latitudeDelta: Math.max(0.01, (north - south) * 1.3), longitudeDelta: Math.max(0.01, (east - west) * 1.3)};
}
