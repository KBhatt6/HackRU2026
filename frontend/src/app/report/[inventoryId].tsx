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
  const { inventoryId, name } = useLocalSearchParams<{ inventoryId: string; name?: string }>();
  const [status, setStatus] = useState(STATUSES[0]);
  const [role, setRole] = useState<'Student (basic)' | 'Authorized student'>('Student (basic)');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function choosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo permission was not granted.');
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
        <SectionTitle>Verification type</SectionTitle>
        <Text onPress={() => setRole('Student (basic)')} style={[styles.option, role === 'Student (basic)' && styles.optionActive]}>
          Basic student report
        </Text>
        <Text onPress={() => setRole('Authorized student')} style={[styles.option, role === 'Authorized student' && styles.optionActive]}>
          Authorized student: photo + location
        </Text>
        <Text style={styles.note}>Authorization is simulated in the hackathon build. A real version would require Rutgers SSO and role approval.</Text>
      </Card>

      {role === 'Authorized student' ? (
        <Card>
          <SectionTitle>Shelf photo</SectionTitle>
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} /> : null}
          <PrimaryButton label={photoUri ? 'Choose a different photo' : 'Choose photo'} onPress={() => void choosePhoto()} />
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
  privacyCard: { backgroundColor: colors.surfaceMuted },
  privacyTitle: { color: colors.ink, fontWeight: '900' },
  privacyText: { color: colors.inkMuted, lineHeight: 21 },
  error: { color: colors.danger, fontWeight: '700', lineHeight: 20 },
  success: { color: colors.available, backgroundColor: colors.availableSoft, padding: 14, borderRadius: radius.md, fontWeight: '800', lineHeight: 20 },
});
