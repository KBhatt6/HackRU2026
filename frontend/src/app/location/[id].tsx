import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { AvailabilityBadge, Card, ErrorState, LoadingState, SectionTitle } from '@/components/ui';
import { Screen } from '@/components/screen';
import { colors, radius, spacing } from '@/constants/theme';
import { MAPBOX_ACCESS_TOKEN } from '@/constants/config';
import { getLocation } from '@/services/api';
import type { Location as LocationRecord } from '@/types/api';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function formatMinute(value: number | null) {
  if (value === null) return null;
  if (value === 1440) return '12:00 AM';
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const twelveHour = hour % 12 || 12;
  return `${twelveHour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export default function LocationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [location, setLocation] = useState<LocationRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [routeLabel, setRouteLabel] = useState<string | null>(null);

  async function getDirections() {
    if (!location?.latitude || !location.longitude) {
      setError('Directions are unavailable because this location has no verified coordinates.');
      return;
    }
    if (!MAPBOX_ACCESS_TOKEN) {
      setError('Mapbox directions are not configured. Add EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to frontend/.env.');
      return;
    }
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Location permission is required for walking directions.');
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const origin = `${current.coords.longitude},${current.coords.latitude}`;
      const destination = `${location.longitude},${location.latitude}`;
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/walking/${origin};${destination}?overview=false&access_token=${MAPBOX_ACCESS_TOKEN}`,
      );
      if (!response.ok) throw new Error('Mapbox could not calculate a walking route.');
      const body = (await response.json()) as { routes?: { duration: number; distance: number }[] };
      const route = body.routes?.[0];
      if (!route) throw new Error('No walking route was found.');
      setRouteLabel(`${Math.max(1, Math.round(route.duration / 60))} min walk · ${(route.distance / 1609.34).toFixed(1)} mi`);
      await Linking.openURL(`https://www.mapbox.com/directions/?origin=${origin}&destination=${destination}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not get directions.');
    }
  }

  async function load() {
    if (!id) return;
    setError(null);
    try {
      setLocation(await getLocation(id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load location.');
    }
  }

  useEffect(() => {
    if (!id) return;
    let active = true;
    getLocation(id)
      .then((value) => {
        if (active) setLocation(value);
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Could not load location.');
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (!location && !error) return <LoadingState label="Loading location…" />;
  if (error) return <Screen><ErrorState message={error} onRetry={() => void load()} /></Screen>;
  if (!location) return null;

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.zone}>{location.campusZone.toUpperCase()}</Text>
        <Text style={styles.title}>{location.locationName}</Text>
        <Text style={styles.description}>{location.siteDescription}</Text>
        {!location.verified ? <Text style={styles.unverified}>Location details need Rutgers confirmation.</Text> : null}
        <Pressable style={styles.directionsButton} onPress={() => void getDirections()}>
          <Text style={styles.directionsText}>Get walking directions</Text>
        </Pressable>
        {routeLabel ? <Text style={styles.routeLabel}>{routeLabel}</Text> : null}
      </View>

      <Card>
        <SectionTitle>Payment information</SectionTitle>
        <Text style={styles.body}>Meal swipes for food today: {location.mealSwipeEligibleForFoodToday ? 'Yes' : 'No'}</Text>
        <Text style={styles.body}>RU Express accepted today: {location.ruExpressAcceptedToday ? 'Yes' : 'No'}</Text>
        <Text style={styles.note}>{location.swipeNotes}</Text>
        <View style={styles.proposedBox}>
          <Text style={styles.proposedTitle}>Health-item swipe use is proposed</Text>
          <Text style={styles.proposedText}>The existing food swipe policy does not verify that medicine can be purchased today.</Text>
        </View>
      </Card>

      <Card>
        <SectionTitle>Hours</SectionTitle>
        {location.hours?.map((hours) => (
          <View key={hours.dayOfWeek} style={styles.hoursRow}>
            <Text style={styles.day}>{DAY_NAMES[hours.dayOfWeek]}</Text>
            <Text style={styles.time}>
              {hours.hoursKnown
                ? `${formatMinute(hours.opensMinute)} – ${formatMinute(hours.closesMinute)}`
                : 'Not listed'}
            </Text>
          </View>
        ))}
        <Text style={styles.note}>{location.hoursBasis}</Text>
      </Card>

      <SectionTitle>Proposed health inventory</SectionTitle>
      {location.inventory?.map((item) => (
        <View key={item.inventoryId} style={styles.inventoryRow}>
          <View style={styles.inventoryCopy}>
            <Text style={styles.productName}>{item.productName}</Text>
            <Text style={styles.confidence}>{item.reportedConfidence}</Text>
          </View>
          <AvailabilityBadge status={item.availability} />
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingVertical: spacing.md, gap: spacing.xs },
  zone: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: colors.ink, fontSize: 32, lineHeight: 38, fontWeight: '900' },
  description: { color: colors.inkMuted, fontSize: 15, lineHeight: 22 },
  unverified: { color: colors.danger, fontWeight: '800', marginTop: spacing.sm },
  directionsButton: { alignSelf: 'flex-start', backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.sm, marginTop: spacing.sm },
  directionsText: { color: colors.white, fontWeight: '700' },
  routeLabel: { color: colors.primaryDark, fontWeight: '700' },
  body: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  note: { color: colors.inkMuted, fontSize: 13, lineHeight: 20 },
  proposedBox: { backgroundColor: colors.lowSoft, borderRadius: radius.sm, padding: 12, gap: 3, marginTop: spacing.sm },
  proposedTitle: { color: colors.low, fontWeight: '900' },
  proposedText: { color: '#704817', fontSize: 13, lineHeight: 19 },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted },
  day: { color: colors.ink, fontWeight: '700' },
  time: { color: colors.inkMuted },
  inventoryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  inventoryCopy: { flex: 1 },
  productName: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  confidence: { color: colors.inkMuted, fontSize: 12, marginTop: 2 },
});
