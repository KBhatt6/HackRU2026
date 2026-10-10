import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { ErrorState, Group, LoadingState, Row, StatusText } from '@/components/ui';
import { Screen } from '@/components/screen';
import { colors, spacing } from '@/constants/theme';
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
      <View style={styles.heading}>
        <Text style={styles.title}>{location.locationName}</Text>
        <Text style={styles.subtitle}>{location.campusZone}</Text>
      </View>

      <Group
        footer={
          [location.siteDescription, location.verified ? null : 'Location details need Rutgers confirmation.']
            .filter(Boolean)
            .join(' ') || undefined
        }
      >
        <Row title="Get walking directions" tone="tint" value={routeLabel} onPress={() => void getDirections()} />
      </Group>

      <Group
        header="Payment"
        footer={`${location.swipeNotes ? `${location.swipeNotes} ` : ''}Health-item swipe use is proposed; the existing food swipe policy does not verify that medicine can be purchased today.`}
      >
        <Row title="Meal swipes for food today" value={location.mealSwipeEligibleForFoodToday ? 'Yes' : 'No'} />
        <Row title="RU Express today" value={location.ruExpressAcceptedToday ? 'Yes' : 'No'} />
      </Group>

      <Group header="Hours" footer={location.hoursBasis || undefined}>
        {location.hours?.map((hours) => (
          <Row
            key={hours.dayOfWeek}
            title={DAY_NAMES[hours.dayOfWeek]}
            value={
              hours.hoursKnown
                ? `${formatMinute(hours.opensMinute)} – ${formatMinute(hours.closesMinute)}`
                : 'Not listed'
            }
          />
        ))}
      </Group>

      <Group header="Proposed health inventory">
        {location.inventory?.map((item) => (
          <Row
            key={item.inventoryId}
            title={item.productName}
            subtitle={<StatusText status={item.availability} />}
            detail={item.reportedConfidence}
            chevron
            onPress={() => router.push(`/product/${item.productId}`)}
          />
        ))}
      </Group>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 2, paddingHorizontal: spacing.xs },
  title: { color: colors.ink, fontSize: 28, lineHeight: 34, fontWeight: '700' },
  subtitle: { color: colors.inkMuted, fontSize: 17, lineHeight: 22 },
});
