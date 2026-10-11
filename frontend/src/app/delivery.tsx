import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CAMPUS_ZONES } from '@/constants/config';
import { clearDeliveryRequest, setDeliveryRequest } from '@/constants/cart';
import { colors, fonts, radius, spacing } from '@/constants/theme';

type Campus = (typeof CAMPUS_ZONES)[number];
type Housing = { name: string; address: string };
type SavedDelivery = { campus: Campus; housing: Housing; confirmationCode: string };

let savedDelivery: SavedDelivery | null = null;

const HOUSING: Record<Campus, { name: string; address: string }[]> = {
  'College Avenue': [
    { name: 'Brett Hall', address: 'Brett Hall, Rutgers University, New Brunswick, NJ' },
    { name: 'Campbell Hall', address: 'Campbell Hall, Rutgers University, New Brunswick, NJ' },
    { name: 'Clothier Hall', address: 'Clothier Hall, 590 George Street, New Brunswick, NJ 08901' },
    { name: 'Demarest Hall', address: 'Demarest Hall, Rutgers University, New Brunswick, NJ' },
    { name: 'Frelinghuysen Hall', address: 'Frelinghuysen Hall, Rutgers University, New Brunswick, NJ' },
    { name: 'Hardenbergh Hall', address: 'Hardenbergh Hall, Rutgers University, New Brunswick, NJ' },
    { name: 'Hegeman Hall', address: 'Hegeman Hall, Rutgers University, New Brunswick, NJ' },
    { name: 'Honors College', address: '5 Seminary Place, New Brunswick, NJ 08901' },
    { name: 'Leupp Hall', address: 'Leupp Hall, Rutgers University, New Brunswick, NJ' },
    { name: 'Mettler Hall', address: 'Mettler Hall, Rutgers University, New Brunswick, NJ' },
    { name: 'Pell Hall', address: 'Pell Hall, Rutgers University, New Brunswick, NJ' },
    { name: 'Sojourner Truth Apartments', address: 'Sojourner Truth Apartments, Rutgers University, New Brunswick, NJ' },
    { name: 'Stonier Hall', address: 'Stonier Hall, Rutgers University, New Brunswick, NJ' },
    { name: 'Tinsley Hall', address: 'Tinsley Hall, Rutgers University, New Brunswick, NJ' },
    { name: 'University Center at Easton Avenue', address: 'University Center at Easton Avenue, New Brunswick, NJ' },
    { name: 'Wessels Hall', address: 'Wessels Hall, Rutgers University, New Brunswick, NJ' },
  ],
  Busch: [
    { name: 'Allen Hall', address: 'Allen Hall, Rutgers University, Piscataway, NJ' },
    { name: 'B.E.S.T Neighborhood', address: 'B.E.S.T Neighborhood, Rutgers University, Piscataway, NJ' },
    { name: 'Barr Hall', address: 'Barr Hall, Rutgers University, Piscataway, NJ' },
    { name: 'Buell Apartments', address: 'Buell Apartments, 55 Bevier Road, Piscataway, NJ 08854' },
    { name: 'Crosby Suites', address: 'Crosby Suites, Rutgers University, Piscataway, NJ' },
    { name: 'Johnson Apartments', address: 'Johnson Apartments, Rutgers University, Piscataway, NJ' },
    { name: 'Judson Suites', address: 'Judson Suites, Rutgers University, Piscataway, NJ' },
    { name: 'Marvin Apartments', address: 'Marvin Apartments, Rutgers University, Piscataway, NJ' },
    { name: 'Mattia Hall', address: 'Mattia Hall, Rutgers University, Piscataway, NJ' },
    { name: 'McCormick Suites', address: 'McCormick Suites, Rutgers University, Piscataway, NJ' },
    { name: 'Metzger Hall', address: 'Metzger Hall, Rutgers University, Piscataway, NJ' },
    { name: 'Morrow Suites', address: 'Morrow Suites, Rutgers University, Piscataway, NJ' },
    { name: 'Nichols Apartments', address: 'Nichols Apartments, Rutgers University, Piscataway, NJ' },
    { name: 'Richardson Apartments', address: 'Richardson Apartments, Rutgers University, Piscataway, NJ' },
    { name: 'Silvers Apartments', address: 'Silvers Apartments, Rutgers University, Piscataway, NJ' },
    { name: 'Thomas Suites', address: 'Thomas Suites, Rutgers University, Piscataway, NJ' },
    { name: 'Winkler Suites', address: 'Winkler Suites, Rutgers University, Piscataway, NJ' },
  ],
  Livingston: [
    { name: 'Lynton Towers North', address: 'Lynton Towers North, Rutgers University, Piscataway, NJ' },
    { name: 'Lynton Towers South', address: 'Lynton Towers South, Rutgers University, Piscataway, NJ' },
    { name: 'Livingston Apartments', address: 'Livingston Apartments, Rutgers University, Piscataway, NJ' },
    { name: 'Quad I', address: 'Quad I, Rutgers University, Piscataway, NJ' },
    { name: 'Quad II', address: 'Quad II, Rutgers University, Piscataway, NJ' },
    { name: 'Quad III', address: 'Quad III, Rutgers University, Piscataway, NJ' },
  ],
  'Cook/Douglass': [
    { name: 'Helyar House', address: 'Helyar House, Rutgers University, New Brunswick, NJ' },
    { name: 'Henderson Apartments', address: 'Henderson Apartments, Rutgers University, New Brunswick, NJ' },
    { name: 'Jameson Hall', address: 'Jameson Hall, Rutgers University, New Brunswick, NJ' },
    { name: 'Katzenbach Hall', address: 'Katzenbach Hall, Rutgers University, New Brunswick, NJ' },
    { name: 'Lippincott Hall', address: 'Lippincott Hall, Rutgers University, New Brunswick, NJ' },
    { name: 'New Gibbons', address: 'New Gibbons, Rutgers University, New Brunswick, NJ' },
    { name: 'Newell Apartments', address: 'Newell Apartments, Rutgers University, New Brunswick, NJ' },
    { name: 'Nicholas Hall', address: 'Nicholas Hall, Rutgers University, New Brunswick, NJ' },
    { name: 'Perry Hall', address: 'Perry Hall, Rutgers University, New Brunswick, NJ' },
    { name: 'Starkey Apartments', address: 'Starkey Apartments, Rutgers University, New Brunswick, NJ' },
    { name: 'Voorhees Hall', address: 'Voorhees Hall, Rutgers University, New Brunswick, NJ' },
    { name: 'Woodbury Bunting-Cobb Hall', address: 'Woodbury Bunting-Cobb Hall, Rutgers University, New Brunswick, NJ' },
  ],
};

export default function DeliveryScreen() {
  const [campus, setCampus] = useState<Campus>('College Avenue');
  const [selectedHousing, setSelectedHousing] = useState<Housing | null>(null);
  const [activeDelivery, setActiveDelivery] = useState<SavedDelivery | null>(savedDelivery);
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const housing = useMemo(() => HOUSING[campus], [campus]);

  function chooseCampus(nextCampus: Campus) {
    setCampus(nextCampus);
    setSelectedHousing(null);
    setSubmitted(false);
    setOpen(false);
  }

  function openInMaps() {
    const destination = activeDelivery?.housing || selectedHousing;
    if (!destination) return;
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination.address)}`);
  }

  function requestDelivery() {
    if (!selectedHousing) return;
    const confirmationCode = `DLV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const nextDelivery = { campus, housing: selectedHousing, confirmationCode };
    savedDelivery = nextDelivery;
    setDeliveryRequest({ confirmationCode, campus, residence: selectedHousing.name, address: selectedHousing.address });
    setActiveDelivery(nextDelivery);
    setSubmitted(true);
  }

  function cancelDelivery() {
    savedDelivery = null;
    clearDeliveryRequest();
    setActiveDelivery(null);
    setSelectedHousing(null);
    setSubmitted(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: 'Delivery' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{activeDelivery ? 'Delivery Set' : 'Request Delivery'}</Text>
        <Text style={styles.subtitle}>{activeDelivery ? 'Your delivery destination is saved for this session.' : 'Tell us where on campus to send your supplies.'}</Text>

        {activeDelivery ? (
          <View style={styles.activeCard}>
            <Text style={styles.cardEyebrow}>ACTIVE DELIVERY DESTINATION</Text>
            <Text style={styles.destinationName}>{activeDelivery.housing.name}</Text>
            <Text style={styles.activeCampus}>{activeDelivery.campus}</Text>
            <Text style={styles.address}>{activeDelivery.housing.address}</Text>
            <Text style={styles.activeCode}>Confirmation code: {activeDelivery.confirmationCode}</Text>
            <Pressable style={styles.mapsButton} onPress={openInMaps}><Text style={styles.mapsText}>Check in Google Maps</Text></Pressable>
            <Pressable style={styles.cancelButton} onPress={cancelDelivery}><Text style={styles.cancelText}>Cancel Delivery</Text></Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.label}>Your campus</Text>
            <View style={styles.chips}>
              {CAMPUS_ZONES.map((zone) => (
                <Pressable key={zone} style={[styles.chip, campus === zone && styles.chipActive]} onPress={() => chooseCampus(zone)}>
                  <Text style={[styles.chipText, campus === zone && styles.chipTextActive]}>{zone}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>On-campus housing</Text>
            <Pressable style={styles.dropdown} onPress={() => setOpen((visible) => !visible)}>
              <Text style={selectedHousing ? styles.dropdownText : styles.placeholder}>{selectedHousing?.name || 'Choose your residence hall'}</Text>
              <Text style={styles.chevron}>{open ? '⌃' : '⌄'}</Text>
            </Pressable>
            {open ? (
              <View style={styles.options}>
                {housing.map((home) => (
                  <Pressable key={home.name} style={styles.option} onPress={() => { setSelectedHousing(home); setOpen(false); setSubmitted(false); }}>
                    <Text style={styles.optionText}>{home.name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {selectedHousing ? (
              <View style={styles.destinationCard}>
                <Text style={styles.cardEyebrow}>DELIVERY DESTINATION</Text>
                <Text style={styles.destinationName}>{selectedHousing.name}</Text>
                <Text style={styles.address}>{selectedHousing.address}</Text>
                <Pressable style={styles.mapsButton} onPress={openInMaps}><Text style={styles.mapsText}>Check in Google Maps</Text></Pressable>
                <Pressable style={styles.submitButton} onPress={requestDelivery}><Text style={styles.submitText}>Request Delivery Here</Text></Pressable>
                {submitted ? <Text style={styles.confirmation}>Delivery request saved for this prototype destination.</Text> : null}
              </View>
            ) : null}
          </>
        )}

        <Text style={styles.disclosure}>Delivery availability and fulfillment are simulated for this prototype.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 48, gap: spacing.md },
  title: { color: colors.white, fontSize: 32, fontWeight: '900', fontFamily: fonts.body },
  subtitle: { color: '#D7D2CD', lineHeight: 21, marginBottom: spacing.md },
  label: { color: colors.white, fontWeight: '800', marginTop: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 10 },
  chipActive: { backgroundColor: colors.primary }, chipText: { color: colors.ink, fontWeight: '700' }, chipTextActive: { color: colors.white },
  dropdown: { minHeight: 52, paddingHorizontal: spacing.md, borderRadius: radius.sm, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownText: { color: colors.ink, fontWeight: '800' }, placeholder: { color: colors.inkMuted }, chevron: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  options: { backgroundColor: colors.surface, borderRadius: radius.sm, overflow: 'hidden' }, option: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }, optionText: { color: colors.ink, fontWeight: '700' },
  destinationCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm, marginTop: spacing.md }, cardEyebrow: { color: colors.primaryDark, fontWeight: '900', letterSpacing: 1 }, destinationName: { color: colors.ink, fontSize: 22, fontWeight: '900' }, address: { color: colors.inkMuted, lineHeight: 21 },
  activeCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm, marginTop: spacing.md }, activeCampus: { color: colors.primaryDark, fontWeight: '800' }, activeCode: { color: colors.primaryDark, fontSize: 18, fontWeight: '900' }, mapsButton: { alignSelf: 'flex-start', backgroundColor: '#147BFF', paddingHorizontal: 14, paddingVertical: 11, borderRadius: radius.sm, marginTop: spacing.sm }, mapsText: { color: colors.white, fontWeight: '800' }, submitButton: { backgroundColor: colors.primary, paddingVertical: 13, borderRadius: radius.sm, alignItems: 'center' }, submitText: { color: colors.white, fontWeight: '900' }, cancelButton: { borderColor: colors.primary, borderWidth: 1, paddingVertical: 12, borderRadius: radius.sm, alignItems: 'center' }, cancelText: { color: colors.primaryDark, fontWeight: '900' }, confirmation: { color: colors.available, fontWeight: '800' }, disclosure: { color: '#D7D2CD', fontSize: 12, lineHeight: 18, marginTop: spacing.lg },
});
