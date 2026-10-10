import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Footnote, Group, PrimaryButton, Row } from '@/components/ui';
import { Screen } from '@/components/screen';
import { DEMO_USER_TOKEN } from '@/constants/config';
import { colors, spacing } from '@/constants/theme';
import { createReservation } from '@/services/api';

const PICKUP_OPTIONS = ['Self pickup', 'Authorized friend pickup'];
const PAYMENT_OPTIONS = ['Proposed retail swipe', 'RU Express', 'Cash or card'];

export default function ReserveScreen() {
  const { inventoryId, product, location } = useLocalSearchParams<{
    inventoryId: string;
    product?: string;
    location?: string;
  }>();
  const [pickupMethod, setPickupMethod] = useState(PICKUP_OPTIONS[0]);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_OPTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reserve() {
    if (!inventoryId) return;
    setLoading(true);
    setError(null);
    try {
      const reservation = await createReservation({
        inventoryId,
        reservedByToken: DEMO_USER_TOKEN,
        pickupMethod,
        paymentMethod,
      });
      router.replace(
        `/reservation/${reservation.reservationId}?pickupCode=${encodeURIComponent(reservation.pickupCode || '')}`,
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not create reservation.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={styles.heading}>
        <Text style={styles.title}>{product || 'Health item'}</Text>
        <Text style={styles.subtitle}>{location || 'Rutgers retail location'}</Text>
      </View>

      <Group header="Pickup">
        {PICKUP_OPTIONS.map((option) => (
          <Row key={option} title={option} checked={pickupMethod === option} onPress={() => setPickupMethod(option)} />
        ))}
      </Group>

      <Group
        header="Expected payment"
        footer={
          paymentMethod === 'Proposed retail swipe'
            ? 'Retail swipes for medicine require Rutgers approval and are not available today.'
            : undefined
        }
      >
        {PAYMENT_OPTIONS.map((option) => (
          <Row key={option} title={option} checked={paymentMethod === option} onPress={() => setPaymentMethod(option)} />
        ))}
      </Group>

      <View style={styles.actions}>
        {error ? <Footnote tone="danger">{error}</Footnote> : null}
        <PrimaryButton label={loading ? 'Reserving…' : 'Confirm 75-minute hold'} disabled={loading} onPress={() => void reserve()} />
        <Footnote>
          First come, first served. The hold begins immediately; if it expires, the item returns to the available pool.
          No medical urgency ranking is used.
        </Footnote>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 2, paddingHorizontal: spacing.xs },
  title: { color: colors.ink, fontSize: 28, lineHeight: 34, fontWeight: '700' },
  subtitle: { color: colors.inkMuted, fontSize: 17, lineHeight: 22 },
  actions: { gap: spacing.sm },
});
