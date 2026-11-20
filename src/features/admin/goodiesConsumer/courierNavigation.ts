import {coordinate} from './deliveryTracking';

export function courierMapUrl(point: unknown, address: unknown): string | null {
  const location = coordinate(point);
  const destination = location ? `${location.latitude},${location.longitude}`
    : typeof address === 'string' ? address.trim() : '';
  return destination
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
    : null;
}
