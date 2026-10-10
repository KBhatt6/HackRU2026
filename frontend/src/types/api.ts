export type AvailabilityStatus =
  | 'Available'
  | 'Low stock'
  | 'Out of stock'
  | 'Unknown'
  | 'Temporarily unavailable'
  | 'Not stocked in proposal';

export type SearchResult = {
  inventoryId: string;
  productId: string;
  productName: string;
  category: string;
  simpleDefinition: string;
  typicalUse: string | null;
  labelCaution: string;
  locationId: string;
  locationName: string;
  campusZone: string;
  siteDescription: string | null;
  latitude: number | null;
  longitude: number | null;
  availability: AvailabilityStatus;
  quantityBand: string;
  confidence: string;
  minutesSinceVerified: number | null;
  lastVerified: string | null;
  isOpen: boolean | null;
  closesAt: string | null;
  closingSoon: boolean;
  distanceKm: number | null;
  travelMinutes: number | null;
  reservationState: 'Yes' | 'No' | 'Verify first';
  reservationMinutes: number;
  retailSwipeStatus: string | null;
  paymentOptions: string | null;
  mealSwipeEligibleForFoodToday: boolean;
  ruExpressAcceptedToday: boolean;
  quantityLimit: string | null;
  score: number;
};

export type SearchResponse = {
  query: { text: string | null; campusZone: string | null; at: string };
  results: SearchResult[];
  count: number;
  prototypeDisclosure: string;
};

export type Product = {
  productId: string;
  productName: string;
  category: string;
  activeIngredientOrType: string | null;
  simpleDefinition: string;
  typicalUse: string | null;
  labelCaution: string;
  productTier: string;
  quantityLimit: string;
  requiresStaffAssistance: boolean;
  retailSwipeStatus: string;
  locations?: {
    inventoryId: string;
    locationId: string;
    locationName: string;
    campusZone: string;
    proposedToStock: boolean;
    availability: AvailabilityStatus;
    quantityBand: string;
    reportedConfidence: string;
    lastVerified: string | null;
  }[];
};

export type Location = {
  locationId: string;
  locationName: string;
  campusZone: string;
  siteDescription: string | null;
  latitude: number | null;
  longitude: number | null;
  coordinateNote: string | null;
  locationType: string;
  mealSwipeEligibleForFoodToday: boolean;
  ruExpressAcceptedToday: boolean;
  swipeNotes: string | null;
  hoursBasis: string | null;
  proposedHealthSection: string;
  reservationSupported: boolean;
  productTier: string;
  verified: boolean;
  verificationNotes: string | null;
  hours?: {
    dayOfWeek: number;
    opensMinute: number | null;
    closesMinute: number | null;
    hoursKnown: boolean;
  }[];
  inventory?: {
    inventoryId: string;
    productId: string;
    productName: string;
    category: string;
    availability: AvailabilityStatus;
    quantityBand: string;
    reportedConfidence: string;
    lastVerified: string | null;
  }[];
};

export type HealthContact = {
  contactId: string;
  name: string;
  type: string;
  phoneOrContact: string;
  whenToUse: string;
  verified: boolean;
};

export type Reservation = {
  reservationId: string;
  inventoryId: string;
  locationName?: string;
  productName?: string;
  createdAt?: string;
  expiresAt: string;
  status: string;
  minutesRemaining?: number | null;
  pickupMethod?: string;
  paymentMethod?: string;
  quantity?: number;
  pickupCode?: string | null;
  pickupCodeLast4?: string | null;
  message?: string;
};
