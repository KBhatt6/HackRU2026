from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Mapping, Optional


def row_to_dict(row: Optional[Mapping[str, Any]]) -> Optional[dict[str, Any]]:
    return dict(row) if row is not None else None


def db_bool(value: Any) -> bool:
    return bool(value)


@dataclass(frozen=True)
class SearchResult:
    inventoryId: str
    productId: str
    productName: str
    category: str
    simpleDefinition: str
    typicalUse: Optional[str]
    labelCaution: str
    locationId: str
    locationName: str
    campusZone: str
    siteDescription: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    availability: str
    quantityBand: str
    confidence: str
    minutesSinceVerified: Optional[int]
    lastVerified: Optional[str]
    isOpen: Optional[bool]
    closesAt: Optional[str]
    closingSoon: bool
    distanceKm: Optional[float]
    travelMinutes: Optional[int]
    reservationState: str
    reservationMinutes: int
    retailSwipeStatus: Optional[str]
    paymentOptions: Optional[str]
    mealSwipeEligibleForFoodToday: bool
    ruExpressAcceptedToday: bool
    quantityLimit: Optional[str]
    score: float

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
