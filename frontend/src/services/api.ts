import { API_BASE_URL } from '@/constants/config';
import type { HealthContact, Location, Product, Reservation, SearchResponse } from '@/types/api';

type SearchInput = {
  query?: string;
  category?: string;
  campusZone: string;
  latitude?: number;
  longitude?: number;
};

// An unreachable LAN address never answers, so without a timeout the UI would spin forever.
const REQUEST_TIMEOUT_MS = 10000;

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    });
  } catch {
    throw new Error(
      `Could not connect to the RU Relief API at ${API_BASE_URL}. ` +
        'Make sure the backend is running, EXPO_PUBLIC_API_URL in frontend/.env uses your computer\'s LAN IP and the backend port, and your phone is on the same Wi-Fi network.',
    );
  } finally {
    clearTimeout(timeout);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || `Request failed with status ${response.status}`);
  }
  return body as T;
}

export function searchInventory(input: SearchInput) {
  const params = new URLSearchParams({ campus_zone: input.campusZone });
  if (input.query) params.set('query', input.query);
  if (input.category) params.set('category', input.category);
  if (input.latitude !== undefined) params.set('latitude', String(input.latitude));
  if (input.longitude !== undefined) params.set('longitude', String(input.longitude));
  return apiRequest<SearchResponse>(`/api/search?${params.toString()}`);
}

export function getProduct(productId: string) {
  return apiRequest<Product>(`/api/products/${encodeURIComponent(productId)}`);
}

export function getLocation(locationId: string) {
  return apiRequest<Location>(`/api/locations/${encodeURIComponent(locationId)}`);
}

export async function getHealthContacts() {
  const response = await apiRequest<{ contacts: HealthContact[] }>('/api/health-contacts');
  return response.contacts;
}

export function createReservation(payload: {
  inventoryId: string;
  reservedByToken: string;
  pickupMethod: string;
  paymentMethod: string;
}) {
  return apiRequest<Reservation>('/api/reservations', {
    method: 'POST',
    body: JSON.stringify({ ...payload, quantity: 1 }),
  });
}

export function getReservation(reservationId: string) {
  return apiRequest<Reservation>(`/api/reservations/${encodeURIComponent(reservationId)}`);
}

export function cancelReservation(reservationId: string, reservedByToken: string) {
  return apiRequest<{ reservationId: string; status: string }>(
    `/api/reservations/${encodeURIComponent(reservationId)}/cancel`,
    { method: 'POST', body: JSON.stringify({ reservedByToken }) },
  );
}

export function submitReport(payload: {
  inventoryId: string;
  reporterRole: 'Student (basic)' | 'Authorized student';
  reporterToken: string;
  reportedStatus: string;
  latitude: number;
  longitude: number;
  photoAttached: boolean;
}) {
  return apiRequest<{
    reportId: string;
    verificationOutcome: string;
    geofenceResult: string;
    geofenceDistanceMeters: number | null;
    expiresAt: string;
    privacy: string;
  }>('/api/reports', { method: 'POST', body: JSON.stringify(payload) });
}
