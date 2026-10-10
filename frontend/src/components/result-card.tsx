import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AvailabilityBadge, ConfidenceBadge, PrimaryButton, SecondaryButton } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import type { SearchResult } from '@/types/api';

export function ResultCard({ result, rank }: { result: SearchResult; rank: number }) {
  return (
    <View style={[styles.card, rank === 0 && styles.bestCard]}>
      <Pressable style={styles.topRow} onPress={() => router.push(`/product/${result.productId}`)}>
        <View style={styles.flex}>
          {rank === 0 ? <Text style={styles.recommended}>BEST MATCH</Text> : null}
          <Text style={styles.product}>{result.productName}</Text>
          <Pressable onPress={() => router.push(`/location/${result.locationId}`)}>
            <Text style={styles.location}>{result.locationName}</Text>
          </Pressable>
        </View>
      </Pressable>

      <View style={styles.badges}>
        <AvailabilityBadge status={result.availability} />
        <ConfidenceBadge confidence={result.confidence} />
      </View>

      {result.minutesSinceVerified !== null ? (
        <Text style={styles.muted}>Updated {result.minutesSinceVerified} minutes ago</Text>
      ) : (
        <Text style={styles.muted}>Prototype inventory has not been verified</Text>
      )}

      <View style={styles.actions}>
        <Pressable
          style={styles.directionsButton}
          onPress={() => router.push(`/location/${result.locationId}`)}
        >
          <Text style={styles.directionsText}>Get directions</Text>
        </Pressable>
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
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  bestCard: { borderColor: colors.accent, borderWidth: 1 },
  topRow: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  recommended: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.1, marginBottom: 3 },
  product: { color: colors.ink, fontFamily: fonts.body, fontSize: 20, lineHeight: 25, fontWeight: '900' },
  location: { color: colors.primary, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, fontWeight: '700', marginTop: 2 },
  score: { display: 'none' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  facts: { display: 'none' },
  fact: { display: 'none' },
  dot: { display: 'none' },
  warning: { display: 'none' },
  muted: { color: colors.inkMuted, fontFamily: fonts.body, fontSize: 13 },
  payment: { display: 'none' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  directionsButton: { backgroundColor: '#147BFF', borderRadius: radius.sm, minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  directionsText: { color: colors.white, fontWeight: '700', fontSize: 13 },
});
