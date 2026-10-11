import Constants from 'expo-constants';

const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];
const defaultApiHost = expoHost || '127.0.0.1';

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || `http://${defaultApiHost}:6000`
).replace(/\/$/, '');

export const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

export function directionsAddress(locationName: string, siteDescription?: string | null) {
  const normalizedName = locationName.toLowerCase();
  if (normalizedName === 'harvest juice bar') return 'Busch Student Center, 604 Bartholomew Rd';
  if (normalizedName.includes('cook')) return 'Cook Student Center, Rutgers University-New Brunswick, New Jersey';
  return siteDescription || 'Rutgers University-New Brunswick, New Jersey';
}

export const DEMO_USER_TOKEN = 'expo-demo-student';

export const CAMPUS_ZONES = [
  'College Avenue',
  'Busch',
  'Livingston',
  'Cook/Douglass',
] as const;

const CAMPUS_CENTERS: Record<(typeof CAMPUS_ZONES)[number], { latitude: number; longitude: number }> = {
  'College Avenue': { latitude: 40.5024945, longitude: -74.4516615 },
  Busch: { latitude: 40.5239095, longitude: -74.4647625 },
  Livingston: { latitude: 40.527178, longitude: -74.4418905 },
  'Cook/Douglass': { latitude: 40.484728, longitude: -74.436627 },
};

export function nearestCampusZone(latitude: number, longitude: number) {
  return CAMPUS_ZONES.reduce((nearest, zone) => {
    const nearestCenter = CAMPUS_CENTERS[nearest];
    const candidateCenter = CAMPUS_CENTERS[zone];
    const nearestDistance = Math.hypot(latitude - nearestCenter.latitude, longitude - nearestCenter.longitude);
    const candidateDistance = Math.hypot(latitude - candidateCenter.latitude, longitude - candidateCenter.longitude);
    return candidateDistance < nearestDistance ? zone : nearest;
  }, CAMPUS_ZONES[0]);
}

export const CATEGORIES = [
  'Pain & fever',
  'Cold & cough',
  'Allergy',
  'Digestive',
  'Hydration',
  'Diagnostics',
  'First aid & comfort',
  'Menstrual & hygiene',
] as const;

export const PROTOTYPE_DISCLOSURE =
  'Medicine stock, reservations, and medicine purchases with retail swipes are simulated features of a proposed Rutgers program.';
