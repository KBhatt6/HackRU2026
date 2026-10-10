import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, PrimaryButton, SectionTitle } from '@/components/ui';
import { Screen } from '@/components/screen';
import { DEMO_USER_TOKEN } from '@/constants/config';
import { colors, radius, spacing } from '@/constants/theme';
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
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>75-MINUTE HOLD</Text>
        <Text style={styles.title}>{product || 'Health item'}</Text>
        <Text style={styles.subtitle}>{location || 'Rutgers retail location'}</Text>
      </View>

      <Card>
        <SectionTitle>Who will pick it up?</SectionTitle>
        <View style={styles.options}>
          {PICKUP_OPTIONS.map((option) => (
            <Text
              key={option}
              onPress={() => setPickupMethod(option)}
              style={[styles.option, pickupMethod === option && styles.optionActive]}
            >
              {option}
            </Text>
          ))}
        </View>
      </Card>

      <Card>
        <SectionTitle>Expected payment</SectionTitle>
        <View style={styles.options}>
          {PAYMENT_OPTIONS.map((option) => (
            <Text
              key={option}
              onPress={() => setPaymentMethod(option)}
              style={[styles.option, paymentMethod === option && styles.optionActive]}
            >
              {option}
            </Text>
          ))}
        </View>
        {paymentMethod === 'Proposed retail swipe' ? (
          <Text style={styles.warning}>Retail swipes for medicine require Rutgers approval and are not available today.</Text>
        ) : null}
      </Card>

      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>First come, first served</Text>
        <Text style={styles.summaryText}>
          The hold begins immediately. If it expires, the item returns to the available pool. No medical urgency ranking is used.
        </Text>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton label={loading ? 'Reserving…' : 'Confirm 75-minute hold'} disabled={loading} onPress={() => void reserve()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingVertical: spacing.md, gap: spacing.xs },
  eyebrow: { color: '#FF7A8E', fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: colors.white, fontSize: 30, lineHeight: 36, fontWeight: '900' },
  subtitle: { color: '#D7D2CD', fontSize: 16 },
  options: { gap: spacing.sm },
  option: { color: colors.ink, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, fontWeight: '700', overflow: 'hidden' },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft, color: colors.primaryDark },
  warning: { color: colors.low, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  summaryCard: { backgroundColor: colors.surfaceMuted },
  summaryTitle: { color: colors.ink, fontWeight: '900' },
  summaryText: { color: colors.inkMuted, lineHeight: 21 },
  error: { color: '#FF7A8E', fontWeight: '700', lineHeight: 20 },
});
