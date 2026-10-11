import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Card, PrimaryButton, SectionTitle } from '@/components/ui';
import { Screen } from '@/components/screen';
import { DEMO_USER_TOKEN } from '@/constants/config';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { submitReport } from '@/services/api';

const STATUSES = ['Available', 'Low stock', 'Out of stock', 'Temporarily unavailable'];

export default function ReportScreen() {
  const { inventoryId, name, locationName, locationLatitude, locationLongitude } = useLocalSearchParams<{ inventoryId: string; name?: string; locationName?: string; locationLatitude?: string; locationLongitude?: string }>();
  const [status, setStatus] = useState(STATUSES[0]);
  const role = 'Authorized student' as const;
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'not-checked' | 'checking' | 'ready' | 'outside' | 'denied'>('not-checked');

  async function choosePhoto() {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo permission was not granted.');
      return;
    }
    setLocationStatus('checking');
    const locationPermission = await Location.requestForegroundPermissionsAsync();
    if (!locationPermission.granted) {
      setLocationStatus('denied');
      setError('Location permission is required to verify that you are at the retail location.');
      return;
    }
    try {
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const targetLatitude = Number(locationLatitude);
      const targetLongitude = Number(locationLongitude);
      if (!Number.isFinite(targetLatitude) || !Number.isFinite(targetLongitude)) {
        setLocationStatus('denied');
        setError(`${locationName || 'This location'} does not have a verified map coordinate yet.`);
        return;
      }
      const distanceMeters = haversineMeters(position.coords.latitude, position.coords.longitude, targetLatitude, targetLongitude);
      setLocationStatus(distanceMeters <= 150 ? 'ready' : 'outside');
    } catch {
      setLocationStatus('denied');
      setError('Could not check your location. Try again near the retail location.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.6,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function sendReport() {
    if (!inventoryId) return;
    if (role === 'Authorized student' && !photoUri) {
      setError('Authorized verification requires a shelf or package photo.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Location permission is required for a stock report.');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const result = await submitReport({
        inventoryId,
        reporterRole: role,
        reporterToken: DEMO_USER_TOKEN,
        reportedStatus: status,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        photoAttached: Boolean(photoUri),
      });
      setSuccess(`${result.verificationOutcome}. Geofence: ${result.geofenceResult}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not submit report.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>ANONYMOUS STOCK CHECK</Text>
        <Text style={styles.title}>{name || 'Health item'}</Text>
        <Text style={styles.subtitle}>Report only what you can see at the retail location.</Text>
      </View>

      <Card>
        <SectionTitle>What is on the shelf?</SectionTitle>
        <View style={styles.options}>
          {STATUSES.map((option) => (
            <Text key={option} onPress={() => setStatus(option)} style={[styles.option, status === option && styles.optionActive]}>
              {option}
            </Text>
          ))}
        </View>
      </Card>

      <Card>
        <SectionTitle>Student verification</SectionTitle>
        <Text style={[styles.option, styles.optionActive]}>Authorized student: photo + location</Text>
        <Text style={styles.note}>This prototype requires a shelf photo and a location check for every stock report. Authorization is simulated in this hackathon build; a real version would use Rutgers SSO and role approval.</Text>
      </Card>

      {role === 'Authorized student' ? (
        <Card>
          <SectionTitle>Shelf photo</SectionTitle>
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} /> : null}
          <PrimaryButton label={photoUri ? 'Choose a different photo' : 'Choose photo'} onPress={() => void choosePhoto()} />
          <View style={[styles.locationCue, locationStatus === 'ready' && styles.locationCueReady, locationStatus === 'denied' && styles.locationCueDenied]}>
            <Text style={styles.locationCueIcon}>{locationStatus === 'checking' ? '◌' : locationStatus === 'ready' ? '✓' : locationStatus === 'outside' ? '!' : '⌖'}</Text>
            <Text style={styles.locationCueText}>
              {locationStatus === 'checking' ? 'Checking your location against the store…' : locationStatus === 'ready' ? `You appear to be at ${locationName || 'this location'}` : locationStatus === 'outside' ? `You are not near ${locationName || 'this location'} — reporting will be rejected` : locationStatus === 'denied' ? 'Location check needed before submitting' : 'Location check will run when you choose a photo'}
            </Text>
          </View>
          <Text style={styles.note}>For this privacy-safe demo, the image remains on the phone; only the attached/not-attached flag reaches the backend.</Text>
        </Card>
      ) : null}

      <Card style={styles.privacyCard}>
        <Text style={styles.privacyTitle}>Privacy</Text>
        <Text style={styles.privacyText}>The backend keeps the geofence distance and result, not your raw GPS coordinates, name, dorm, symptoms, or diagnosis.</Text>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}
      <PrimaryButton label={loading ? 'Submitting…' : 'Submit stock report'} disabled={loading || Boolean(success)} onPress={() => void sendReport()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingVertical: spacing.md, gap: spacing.xs },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  title: { fontFamily: fonts.heading, color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: '900' },
  subtitle: { color: colors.inkMuted, fontSize: 15, lineHeight: 22 },
  options: { gap: spacing.sm },
  option: { color: colors.ink, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, fontWeight: '700', overflow: 'hidden' },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft, color: colors.primaryDark },
  note: { color: colors.inkMuted, fontSize: 12, lineHeight: 18 },
  preview: { width: '100%', height: 180, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  locationCue: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.sm },
  locationCueReady: { backgroundColor: colors.availableSoft, borderColor: colors.available },
  locationCueDenied: { backgroundColor: colors.dangerSoft, borderColor: colors.primary },
  locationCueIcon: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  locationCueText: { flex: 1, color: colors.ink, fontWeight: '700', lineHeight: 19 },
  privacyCard: { backgroundColor: colors.surfaceMuted },
  privacyTitle: { color: colors.ink, fontWeight: '900' },
  privacyText: { color: colors.inkMuted, lineHeight: 21 },
  error: { color: colors.danger, fontWeight: '700', lineHeight: 20 },
  success: { color: colors.available, backgroundColor: colors.availableSoft, padding: 14, borderRadius: radius.md, fontWeight: '800', lineHeight: 20 },
});

function haversineMeters(latitudeOne: number, longitudeOne: number, latitudeTwo: number, longitudeTwo: number) {
  const earthRadiusMeters = 6_371_008.8;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(latitudeTwo - latitudeOne);
  const longitudeDelta = toRadians(longitudeTwo - longitudeOne);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(latitudeOne)) * Math.cos(toRadians(latitudeTwo)) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
