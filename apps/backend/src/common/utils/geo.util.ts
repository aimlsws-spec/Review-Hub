const EARTH_RADIUS_METERS = 6_371_000;

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** Great-circle distance between two points, in meters. Accurate enough for nearest-sort and check-in radius checks; not for surveying. */
export function haversineDistanceMeters(a: GeoPoint, b: GeoPoint): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const sinHalfLat = Math.sin(deltaLat / 2);
  const sinHalfLng = Math.sin(deltaLng / 2);
  const h = sinHalfLat * sinHalfLat + Math.cos(lat1) * Math.cos(lat2) * sinHalfLng * sinHalfLng;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}
