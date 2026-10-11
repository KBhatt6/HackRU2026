export type CartReservation = {
  reservationId: string;
  productName: string;
  locationName: string;
  expiresAt: string;
  pickupCode?: string | null;
};
export type DeliveryRequest = { confirmationCode: string; campus: string; residence: string; address: string };

let reservations: CartReservation[] = [];
let deliveryRequest: DeliveryRequest | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function getCartReservations() {
  return reservations;
}

export function addCartReservation(item: CartReservation) {
  reservations = [item, ...reservations.filter((existing) => existing.reservationId !== item.reservationId)];
  notify();
}

export function removeCartReservation(reservationId: string) {
  reservations = reservations.filter((item) => item.reservationId !== reservationId);
  notify();
}

export function subscribeToCart(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getDeliveryRequest() { return deliveryRequest; }
export function setDeliveryRequest(request: DeliveryRequest) { deliveryRequest = request; notify(); }
export function clearDeliveryRequest() { deliveryRequest = null; notify(); }
