import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AvailabilityBadge, ConfidenceBadge, PrimaryButton, SecondaryButton } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import type { SearchResult } from '@/types/api';

export function ResultCard({ result, rank }: { result: SearchResult; rank: number }) {
  const openLabel = result.isOpen === true ? `Open${result.closesAt ? ` until ${result.closesAt}` : ''}` : result.isOpen === false ? 'Closed' : 'Hours unknown';
  const distanceLabel = result.travelMinutes ? `${result.travelMinutes} min walk` : 'Travel time unavailable';

  return (
    <View style={[styles.card, rank === 0 && styles.bestCard]}>
      <View style={styles.topRow}>
        <View style={styles.flex}>
          {rank === 0 ? <Text style={styles.recommended}>BEST MATCH</Text> : null}
          <Pressable onPress={() => router.push(`/product/${result.productId}`)}>
            <Text style={styles.product}>{result.productName}</Text>
          </Pressable>
          <Pressable onPress={() => router.push(`/location/${result.locationId}`)}>
            <Text style={styles.location}>{result.locationName}</Text>
          </Pressable>
        </View>
        <Text style={styles.score}>{Math.round(result.score * 100)}</Text>
      </View>

      <View style={styles.badges}>
        <AvailabilityBadge status={result.availability} />
        <ConfidenceBadge confidence={result.confidence} />
      </View>

      <View style={styles.facts}>
        <Text style={styles.fact}>{openLabel}</Text>
        <Text style={styles.dot}>•</Text>
        <Text style={styles.fact}>{distanceLabel}</Text>
        {result.closingSoon ? <Text style={styles.warning}>Closing soon</Text> : null}
      </View>

      {result.minutesSinceVerified !== null ? (
        <Text style={styles.muted}>Updated {result.minutesSinceVerified} minutes ago</Text>
      ) : (
        <Text style={styles.muted}>Prototype inventory has not been verified</Text>
      )}

      <Text style={styles.payment}>{result.paymentOptions || 'Payment details unavailable'}</Text>

      <View style={styles.actions}>
        <View style={styles.flex}>
          <SecondaryButton
            label="Report stock"
            onPress={() => router.push(`/report/${result.inventoryId}?name=${encodeURIComponent(result.productName)}`)}
          />
        </View>
        <View style={styles.flex}>
          <PrimaryButton
            label={result.reservationState === 'Yes' ? 'Reserve' : result.reservationState}
            disabled={result.reservationState !== 'Yes'}
            onPress={() =>
              router.push(
                `/reserve/${result.inventoryId}?product=${encodeURIComponent(result.productName)}&location=${encodeURIComponent(result.locationName)}`,
              )
            }
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  bestCard: { borderColor: colors.primary, borderWidth: 2 },
  topRow: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  recommended: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.1, marginBottom: 3 },
  product: { color: colors.ink, fontSize: 20, lineHeight: 25, fontWeight: '900' },
  location: { color: colors.primary, fontSize: 15, lineHeight: 22, fontWeight: '700', marginTop: 2 },
  score: { color: colors.inkMuted, fontSize: 13, fontWeight: '800' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  facts: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  fact: { color: colors.ink, fontWeight: '700', fontSize: 13 },
  dot: { color: colors.border },
  warning: { color: colors.low, fontWeight: '800', fontSize: 13 },
  muted: { color: colors.inkMuted, fontSize: 13 },
  payment: { color: colors.inkMuted, fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
});
