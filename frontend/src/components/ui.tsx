import { Children, Fragment, type PropsWithChildren, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import type { AvailabilityStatus } from '@/types/api';

/** Inset grouped list section (iOS Settings style): optional header, rows, optional footer. */
export function Group({ header, footer, children }: PropsWithChildren<{ header?: string; footer?: ReactNode }>) {
  const rows = Children.toArray(children);
  return (
    <View>
      {header ? <Text style={styles.groupHeader}>{header.toUpperCase()}</Text> : null}
      {rows.length ? (
        <View style={styles.group}>
          {rows.map((row, index) => (
            <Fragment key={index}>
              {index > 0 ? <View style={styles.separator} /> : null}
              {row}
            </Fragment>
          ))}
        </View>
      ) : null}
      {footer ? <Footnote>{footer}</Footnote> : null}
    </View>
  );
}

type RowTone = 'default' | 'tint' | 'danger' | 'disabled';

/** A single list row. Pass `onPress` to make it tappable; `chevron` for navigation rows. */
export function Row({
  title,
  subtitle,
  detail,
  value,
  onPress,
  chevron,
  checked,
  tone = 'default',
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  detail?: ReactNode;
  value?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  checked?: boolean;
  tone?: RowTone;
}) {
  const disabled = tone === 'disabled';
  const titleColor =
    tone === 'tint' ? colors.tint : tone === 'danger' ? colors.danger : disabled ? colors.inkFaint : colors.ink;
  const content = (
    <>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, { color: titleColor }]}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      {value !== undefined && value !== null ? <Text style={styles.rowValue}>{value}</Text> : null}
      {checked ? <Text style={styles.check}>✓</Text> : null}
      {chevron ? <Text style={styles.chevron}>›</Text> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: checked }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {content}
    </Pressable>
  );
}

/** Small grey explanatory text, used under groups and for disclosures. */
export function Footnote({ children, tone }: PropsWithChildren<{ tone?: 'danger' | 'success' }>) {
  const color = tone === 'danger' ? colors.danger : tone === 'success' ? colors.available : colors.inkMuted;
  return <Text style={[styles.footnote, { color }]}>{children}</Text>;
}

export function availabilityColor(status: AvailabilityStatus | string) {
  if (status === 'Available') return colors.available;
  if (status === 'Low stock') return colors.low;
  if (status === 'Out of stock' || status === 'Temporarily unavailable') return colors.danger;
  return colors.inkMuted;
}

/** Availability as tinted inline text — meant to sit inside a subtitle, not as a badge. */
export function StatusText({ status }: { status: AvailabilityStatus | string }) {
  return <Text style={[styles.status, { color: availabilityColor(status) }]}>{status}</Text>;
}

export function ConfidenceText({ confidence }: { confidence: string }) {
  return <Text style={{ color: confidence === 'Stale report' ? colors.stale : colors.inkMuted }}>{confidence}</Text>;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  destructive,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        destructive && styles.destructiveButton,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
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
      <ActivityIndicator color={colors.inkMuted} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Group footer={message}>
      <Row title="Could not load this information" tone="danger" />
      {onRetry ? <Row title="Try again" tone="tint" onPress={onRetry} /> : null}
    </Group>
  );
}

const styles = StyleSheet.create({
  groupHeader: {
    color: colors.inkMuted,
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: spacing.md,
    marginBottom: 6,
  },
  group: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: spacing.md },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  rowPressed: { backgroundColor: colors.surfacePressed },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 17, lineHeight: 22 },
  rowSubtitle: { color: colors.inkMuted, fontSize: 15, lineHeight: 20 },
  rowDetail: { color: colors.inkMuted, fontSize: 13, lineHeight: 18 },
  rowValue: { color: colors.inkMuted, fontSize: 17, lineHeight: 22, flexShrink: 1, textAlign: 'right' },
  check: { color: colors.tint, fontSize: 17, fontWeight: '600' },
  chevron: { color: colors.inkFaint, fontSize: 24, lineHeight: 24, marginTop: -2 },
  footnote: { fontSize: 13, lineHeight: 18, paddingHorizontal: spacing.md, marginTop: 6 },
  status: { fontWeight: '500' },
  primaryButton: {
    minHeight: 50,
    borderRadius: radius.lg,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  destructiveButton: { backgroundColor: colors.danger },
  disabledButton: { backgroundColor: colors.surfaceMuted },
  pressed: { opacity: 0.7 },
  primaryButtonText: { color: colors.white, fontWeight: '600', fontSize: 17 },
  secondaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: colors.tint, fontSize: 17 },
  loading: { paddingVertical: 60, gap: spacing.sm, alignItems: 'center' },
  loadingText: { color: colors.inkMuted, fontSize: 15 },
});
