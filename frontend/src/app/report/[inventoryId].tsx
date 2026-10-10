import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Footnote, Group, PrimaryButton, Row, StatusText } from '@/components/ui';
import { Screen } from '@/components/screen';
import { DEMO_USER_TOKEN } from '@/constants/config';
import { colors, spacing } from '@/constants/theme';
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
      <View style={styles.heading}>
        <Text style={styles.title}>{name || 'Health item'}</Text>
        <Text style={styles.subtitle}>Anonymous stock check. Report only what you can see at the retail location.</Text>
      </View>

      <Group header="On the shelf">
        {STATUSES.map((option) => (
          <Row
            key={option}
            title={<StatusText status={option} />}
            checked={status === option}
            onPress={() => setStatus(option)}
          />
        ))}
      </Group>

      <Group
        header="Verification"
        footer="Authorization is simulated in the hackathon build. A real version would require Rutgers SSO and role approval."
      >
        <Row title="Basic student report" checked={role === 'Student (basic)'} onPress={() => setRole('Student (basic)')} />
        <Row
          title="Authorized student"
          subtitle="Photo + location"
          checked={role === 'Authorized student'}
          onPress={() => setRole('Authorized student')}
        />
      </Group>

      {role === 'Authorized student' ? (
        <Group
          header="Shelf photo"
          footer="For this privacy-safe demo, the image remains on the phone; only the attached/not-attached flag reaches the backend."
        >
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} /> : null}
          <Row
            title={photoUri ? 'Choose a different photo' : 'Choose photo'}
            tone="tint"
            onPress={() => void choosePhoto()}
          />
        </Group>
      ) : null}

      <View style={styles.actions}>
        {error ? <Footnote tone="danger">{error}</Footnote> : null}
        {success ? <Footnote tone="success">{success}</Footnote> : null}
        <PrimaryButton
          label={loading ? 'Submitting…' : 'Submit stock report'}
          disabled={loading || Boolean(success)}
          onPress={() => void sendReport()}
        />
        <Footnote>
          The backend keeps the geofence distance and result, not your raw GPS coordinates, name, dorm, symptoms, or
          diagnosis.
        </Footnote>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 2, paddingHorizontal: spacing.xs },
  title: { color: colors.ink, fontSize: 28, lineHeight: 34, fontWeight: '700' },
  subtitle: { color: colors.inkMuted, fontSize: 15, lineHeight: 20 },
  preview: { width: '100%', height: 180, backgroundColor: colors.surfaceMuted },
  actions: { gap: spacing.sm },
});
