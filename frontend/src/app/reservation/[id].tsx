import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, ErrorState, LoadingState, PrimaryButton, SecondaryButton, SectionTitle } from '@/components/ui';
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
        <Text style={styles.status}>{active ? 'HOLD ACTIVE' : reservation.status.toUpperCase()}</Text>
        <Text style={styles.timer}>{active ? timer : '00:00'}</Text>
        <Text style={styles.timerLabel}>remaining</Text>
      </View>

      <Card>
        <SectionTitle>{reservation.productName || 'Reserved item'}</SectionTitle>
        <Text style={styles.location}>{reservation.locationName}</Text>
        <Text style={styles.detail}>Pickup: {reservation.pickupMethod}</Text>
        <Text style={styles.detail}>Payment: {reservation.paymentMethod}</Text>
      </Card>

      {pickupCode ? (
        <Card style={styles.codeCard}>
          <Text style={styles.codeLabel}>ONE-TIME PICKUP CODE</Text>
          <Text selectable style={styles.code}>{pickupCode}</Text>
          <Text style={styles.codeHelp}>Show this code to the staff member. It is only displayed in full on this device.</Text>
        </Card>
      ) : (
        <Card>
          <Text style={styles.detail}>Pickup code ending in {reservation.pickupCodeLast4 || '—'}</Text>
        </Card>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {active ? <PrimaryButton destructive label="Cancel reservation" onPress={() => void cancel()} /> : null}
      <SecondaryButton label="Back to search" onPress={() => router.replace('/')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: spacing.lg },
  status: { color: colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 1.3 },
  timer: { color: colors.ink, fontSize: 64, lineHeight: 72, fontWeight: '900', fontVariant: ['tabular-nums'] },
  timerLabel: { color: colors.inkMuted, fontWeight: '700' },
  location: { color: colors.primary, fontWeight: '800', fontSize: 16 },
  detail: { color: colors.inkMuted, fontSize: 14, lineHeight: 21 },
  codeCard: { alignItems: 'center', backgroundColor: colors.primarySoft },
  codeLabel: { color: colors.primaryDark, fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  code: { color: colors.primaryDark, fontSize: 32, fontWeight: '900', letterSpacing: 2 },
  codeHelp: { color: colors.primaryDark, textAlign: 'center', fontSize: 12, lineHeight: 18 },
  error: { color: colors.danger, fontWeight: '700' },
});
