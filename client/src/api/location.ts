import { api } from './client';
import type { ServiceLocation } from '../types/hospital';

interface LocationsResponse {
  locations: ServiceLocation[];
}

export const locationApi = {
  list: () => api.get<LocationsResponse>('/api/locations'),
};

/** Haversine distance in kilometres between two WGS-84 points. */
export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

/** Nearest service location to a device position (used for the default suggestion). */
export function nearestLocation(
  locations: ServiceLocation[],
  latitude: number,
  longitude: number,
): ServiceLocation | null {
  let best: ServiceLocation | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const location of locations) {
    const distance = distanceKm(latitude, longitude, location.latitude, location.longitude);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = location;
    }
  }
  return best;
}
