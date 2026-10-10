import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ErrorState, Footnote, Group, LoadingState, Row } from '@/components/ui';
import { Screen } from '@/components/screen';
import { DEMO_USER_TOKEN } from '@/constants/config';
import { colors, spacing } from '@/constants/theme';
import { cancelReservation, getReservation } from '@/services/api';
import type { Reservation } from '@/types/api';

export default function ReservationScreen() {
  const { id, pickupCode } = useLocalSearchParams<{ id: string; pickupCode?: string }>();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  async function load() {
    if (!id) return;
    setError(null);
    try {
      setReservation(await getReservation(id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load reservation.');
    }
  }

  useEffect(() => {
    if (!id) return;
    let active = true;
    getReservation(id)
      .then((value) => {
        if (active) setReservation(value);
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Could not load reservation.');
      });
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [id]);

  async function cancel() {
    if (!id) return;
    try {
      await cancelReservation(id, DEMO_USER_TOKEN);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not cancel reservation.');
    }
  }

  if (!reservation && !error) return <LoadingState label="Loading reservation…" />;
  if (error && !reservation) return <Screen><ErrorState message={error} onRetry={() => void load()} /></Screen>;
  if (!reservation) return null;

  const seconds = now ? Math.max(0, Math.floor((new Date(reservation.expiresAt).getTime() - now) / 1000)) : 0;
  const timer = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const active = reservation.status === 'Active' && seconds > 0;

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={[styles.timer, !active && styles.timerInactive]}>{active ? timer : '00:00'}</Text>
        <Text style={styles.timerLabel}>{active ? 'Hold active · time remaining' : reservation.status}</Text>
      </View>

      <Group header="Item">
        <Row title={reservation.productName || 'Reserved item'} subtitle={reservation.locationName} />
        {reservation.pickupMethod ? <Row title="Pickup" value={reservation.pickupMethod} /> : null}
        {reservation.paymentMethod ? <Row title="Payment" value={reservation.paymentMethod} /> : null}
      </Group>

      {pickupCode ? (
        <Group
          header="One-time pickup code"
          footer="Show this code to the staff member. It is only displayed in full on this device."
        >
          <View style={styles.codeRow}>
            <Text selectable style={styles.code}>{pickupCode}</Text>
          </View>
        </Group>
      ) : (
        <Group header="Pickup code">
          <Row title="Ending in" value={reservation.pickupCodeLast4 || '—'} />
        </Group>
      )}

      {error ? <Footnote tone="danger">{error}</Footnote> : null}
      <Group>
        {active ? <Row title="Cancel reservation" tone="danger" onPress={() => void cancel()} /> : null}
        <Row title="Back to search" tone="tint" onPress={() => router.replace('/')} />
      </Group>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: spacing.md },
  timer: { color: colors.ink, fontSize: 64, lineHeight: 72, fontWeight: '300', fontVariant: ['tabular-nums'] },
  timerInactive: { color: colors.inkFaint },
  timerLabel: { color: colors.inkMuted, fontSize: 15 },
  codeRow: { paddingVertical: spacing.md, alignItems: 'center' },
  code: { color: colors.ink, fontSize: 32, fontWeight: '600', letterSpacing: 4, fontVariant: ['tabular-nums'] },
});
