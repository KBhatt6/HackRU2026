import Constants from 'expo-constants';

const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];
const defaultApiHost = expoHost || '127.0.0.1';

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || `http://${defaultApiHost}:5000`
).replace(/\/$/, '');

export const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

export const DEMO_USER_TOKEN = 'expo-demo-student';

export const CAMPUS_ZONES = [
  'College Avenue',
  'Busch',
  'Livingston',
  'Cook/Douglass',
] as const;

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
