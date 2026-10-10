import { router } from 'expo-router';
import { Text } from 'react-native';

import { ConfidenceText, Group, Row, StatusText } from '@/components/ui';
import { colors } from '@/constants/theme';
import type { SearchResult } from '@/types/api';

export function ResultCard({ result, rank }: { result: SearchResult; rank: number }) {
  const openLabel =
    result.isOpen === true
      ? `Open${result.closesAt ? ` until ${result.closesAt}` : ''}`
      : result.isOpen === false
        ? 'Closed'
        : 'Hours unknown';
  const walkLabel = result.travelMinutes ? ` · ${result.travelMinutes} min walk` : '';
  const updatedLabel =
    result.minutesSinceVerified !== null
      ? result.minutesSinceVerified < 1
        ? 'Updated just now.'
        : `Updated ${result.minutesSinceVerified} min ago.`
      : 'Prototype inventory has not been verified.';
  const canReserve = result.reservationState === 'Yes';
  const reserveLabel = canReserve
    ? `Reserve for ${result.reservationMinutes} minutes`
    : result.reservationState === 'Verify first'
      ? 'Verify stock before reserving'
      : 'Reservations unavailable';

  return (
    <Group
      header={rank === 0 ? 'Best match' : undefined}
      footer={`${updatedLabel} ${result.paymentOptions || 'Payment details unavailable.'}`}
    >
      <Row
        title={result.productName}
        subtitle={
          <>
            <StatusText status={result.availability} />
            {' · '}
            <ConfidenceText confidence={result.confidence} />
          </>
        }
        chevron
        onPress={() => router.push(`/product/${result.productId}`)}
      />
      <Row
        title={result.locationName}
        subtitle={
          <>
            {openLabel}
            {walkLabel}
            {result.closingSoon ? <Text style={{ color: colors.low }}> · Closing soon</Text> : null}
          </>
        }
        chevron
        onPress={() => router.push(`/location/${result.locationId}`)}
      />
      <Row
        title={reserveLabel}
        tone={canReserve ? 'tint' : 'disabled'}
        onPress={() =>
          router.push(
            `/reserve/${result.inventoryId}?product=${encodeURIComponent(result.productName)}&location=${encodeURIComponent(result.locationName)}`,
          )
        }
      />
      <Row
        title="Report stock"
        tone="tint"
        onPress={() => router.push(`/report/${result.inventoryId}?name=${encodeURIComponent(result.productName)}`)}
      />
    </Group>
  );
}
