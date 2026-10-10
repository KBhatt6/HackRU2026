from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Mapping


def row_to_dict(row: Mapping[str, Any] | None) -> dict[str, Any] | None:
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
    typicalUse: str | None
    labelCaution: str
    locationId: str
    locationName: str
    campusZone: str
    siteDescription: str | None
    latitude: float | None
    longitude: float | None
    availability: str
    quantityBand: str
    confidence: str
    minutesSinceVerified: int | None
    lastVerified: str | None
    isOpen: bool | None
    closesAt: str | None
    closingSoon: bool
    distanceKm: float | None
    travelMinutes: int | None
    reservationState: str
    reservationMinutes: int
    retailSwipeStatus: str | None
    paymentOptions: str | None
    mealSwipeEligibleForFoodToday: bool
    ruExpressAcceptedToday: bool
    quantityLimit: str | None
    score: float

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

