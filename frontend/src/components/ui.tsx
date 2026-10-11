import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, fonts, radius, spacing } from '@/constants/theme';
import type { AvailabilityStatus } from '@/types/api';

export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: PropsWithChildren) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  destructive,
  compact,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        compact && styles.compactButton,
        destructive && styles.destructiveButton,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text numberOfLines={1} style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
    >
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card style={styles.errorCard}>
      <Text style={styles.errorTitle}>Could not load this information</Text>
      <Text style={styles.muted}>{message}</Text>
      {onRetry ? <SecondaryButton label="Try again" onPress={onRetry} /> : null}
    </Card>
  );
}

export function AvailabilityBadge({ status }: { status: AvailabilityStatus }) {
  let palette = { background: colors.unknownSoft, text: colors.unknown };
  if (status === 'Available') palette = { background: colors.availableSoft, text: colors.available };
  if (status === 'Low stock') palette = { background: colors.lowSoft, text: colors.low };
  if (status === 'Out of stock' || status === 'Temporarily unavailable') {
    palette = { background: colors.dangerSoft, text: colors.danger };
  }
  return (
    <View style={[styles.badge, { backgroundColor: palette.background }]}>
      <Text style={[styles.badgeText, { color: palette.text }]}>{status}</Text>
    </View>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: string }) {
  const stale = confidence === 'Stale report';
  return (
    <View style={[styles.badge, { backgroundColor: stale ? colors.staleSoft : colors.primarySoft }]}>
      <Text style={[styles.badgeText, { color: stale ? colors.stale : colors.primaryDark }]}>
        {confidence}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 20, lineHeight: 26, fontWeight: '800' },
  primaryButton: {
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  compactButton: { minHeight: 44, paddingHorizontal: 10 },
  destructiveButton: { backgroundColor: colors.danger },
  disabledButton: { opacity: 0.42 },
  pressed: { opacity: 0.75 },
  primaryButtonText: { color: colors.white, fontFamily: fonts.body, fontWeight: '700', fontSize: 15 },
  secondaryButton: {
    minHeight: 44,
    borderRadius: radius.md,
    borderColor: colors.primary,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: { color: colors.primaryDark, fontFamily: fonts.body, fontWeight: '700', fontSize: 15 },
  loading: { paddingVertical: 60, gap: spacing.md, alignItems: 'center' },
  muted: { color: colors.inkMuted, fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  errorCard: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
  errorTitle: { color: colors.danger, fontFamily: fonts.body, fontWeight: '800', fontSize: 16 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 0, borderWidth: 1, borderColor: colors.ink },
  badgeText: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, fontWeight: '800' },
});
