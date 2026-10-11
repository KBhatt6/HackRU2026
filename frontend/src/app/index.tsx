import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ResultCard } from '@/components/result-card';
import { ErrorState } from '@/components/ui';
import { CAMPUS_ZONES, CATEGORIES, directionsAddress, nearestCampusZone } from '@/constants/config';
import { getCartReservations, subscribeToCart } from '@/constants/cart';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { searchInventory } from '@/services/api';
import type { SearchResult } from '@/types/api';

export default function HomeScreen() {
  const [campusZone, setCampusZone] = useState<(typeof CAMPUS_ZONES)[number]>('College Avenue');
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [otherCampusResults, setOtherCampusResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [cartCount, setCartCount] = useState(getCartReservations().length);

  useEffect(() => subscribeToCart(() => setCartCount(getCartReservations().length)), []);

  async function addCurrentLocation() {
    setError(null);
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setError('Location permission was not granted. Search still works without walking-time estimates.');
      return;
    }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const nextCoordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    setCoordinates(nextCoordinates);
    const nearestZone = nearestCampusZone(nextCoordinates.latitude, nextCoordinates.longitude);
    setCampusZone(nearestZone);
    if (query.trim() || activeCategory) {
      void performSearch(activeCategory, nearestZone);
    }
  }

  async function performSearch(category = activeCategory, zone = campusZone) {
    if (!query.trim() && !category) {
      setError('Enter a product or choose a category.');
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    setSearched(true);
    setOtherCampusResults([]);
    try {
      const response = await searchInventory({
        query: query.trim() || undefined,
        category: query.trim() ? undefined : category || undefined,
        campusZone: zone,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
      });
      setResults(response.results);
      if (!response.results.some((result) => result.isOpen === true)) {
        const otherZones = CAMPUS_ZONES.filter((candidate) => candidate !== zone);
        const fallbackResponses = await Promise.all(otherZones.map((candidate) => searchInventory({
          query: query.trim() || undefined,
          category: query.trim() ? undefined : category || undefined,
          campusZone: candidate,
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude,
        })));
        const fallbackResults = fallbackResponses
          .flatMap((fallbackResponse) => fallbackResponse.results)
          .sort((left, right) => {
            const openDifference = Number(right.isOpen === true) - Number(left.isOpen === true);
            if (openDifference) return openDifference;
            return (left.distanceKm ?? Number.POSITIVE_INFINITY) - (right.distanceKm ?? Number.POSITIVE_INFINITY);
          });
        setOtherCampusResults(fallbackResults.slice(0, 5));
      }
    } catch (requestError) {
      setResults([]);
      setError(requestError instanceof Error ? requestError.message : 'Search failed.');
    } finally {
      setLoading(false);
    }
  }

  function chooseCategory(category: string) {
    setQuery('');
    setActiveCategory(category);
    void performSearch(category);
  }

  function chooseCampusZone(zone: (typeof CAMPUS_ZONES)[number]) {
    setCampusZone(zone);
    if (query.trim() || activeCategory) {
      void performSearch(activeCategory, zone);
    }
  }

  const openResults = results.filter((result) => result.isOpen === true);
  const closedCount = results.length - openResults.length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>RU Relief</Text>
          </View>
          <Pressable style={styles.helpButton} onPress={() => router.push('/help')}>
            <Text style={styles.helpButtonText}>Get help</Text>
          </Pressable>
          <Pressable style={styles.cartButton} onPress={() => router.push('/cart')}>
            <Text style={styles.cartButtonText}>Cart{cartCount ? ` (${cartCount})` : ''}</Text>
          </Pressable>
        </View>

        <View style={styles.welcomeCard}>
          <View style={styles.welcomeMark}><Text style={styles.welcomeMarkText}>RU</Text></View>
          <View style={styles.welcomeCopy}><Text style={styles.welcomeTitle}>Welcome, Scarlet Knight</Text><Text style={styles.welcomeText}>Find what you need on campus today.</Text></View>
        </View>

        <View style={styles.searchPanel}>
          <Text style={styles.label}>Your campus</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {CAMPUS_ZONES.map((zone) => (
              <Pressable
                key={zone}
                onPress={() => chooseCampusZone(zone)}
                style={[styles.chip, campusZone === zone && styles.chipActive]}
              >
                <Text style={[styles.chipText, campusZone === zone && styles.chipTextActive]}>{zone}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.label}>What product are you looking for?</Text>
          <View style={styles.searchRow}>
            <TextInput
              value={query}
              onChangeText={(value) => {
                setQuery(value);
                if (value) setActiveCategory(null);
              }}
              onSubmitEditing={() => void performSearch(null)}
              placeholder="Try Tylenol, Advil, thermometer…"
              placeholderTextColor={colors.inkMuted}
              returnKeyType="search"
              style={styles.input}
            />
            <Pressable style={styles.searchButton} onPress={() => void performSearch(null)}>
              <Text style={styles.searchButtonText}>⌕</Text>
            </Pressable>
          </View>

        </View>

        <View style={styles.locationActions}>
          <Pressable style={styles.locationButton} onPress={() => void addCurrentLocation()}>
            <Text style={styles.locationButtonText}>{coordinates ? 'Location added' : 'Add location'}</Text>
          </Pressable>
          <Pressable style={styles.askButton} onPress={() => void Linking.openURL('tel:8008905882')}>
            <Text style={styles.askText}>Ask RSH Nurse</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse by category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator indicatorStyle="black" contentContainerStyle={styles.categoryGrid}>
            {CATEGORIES.map((category) => (
              <Pressable
                key={category}
                onPress={() => chooseCategory(category)}
                style={[styles.category, activeCategory === category && styles.categoryActive]}
              >
                <Text style={[styles.categoryText, activeCategory === category && styles.categoryTextActive]}>
                  {category}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
          <View style={styles.featureCard}>
            <Pressable onPress={() => results[0] ? router.push(`/product/${results[0].productId}`) : void performSearch('Pain & fever')}>
            <Text style={styles.featureEyebrow}>NEAREST TO YOU</Text>
            <Text style={styles.featureTitle}>{results[0]?.productName || 'Advil'}</Text>
            <Text style={styles.featureText}>{results[0]?.locationName || 'Livingston Student Center'} · {results[0]?.travelMinutes ? `${results[0].travelMinutes} min walk` : '0.3 mi'} · in stock</Text>
            </Pressable>
            <View style={styles.featureActions}>
              <Pressable
                style={styles.directionsButton}
                onPress={() => {
                  if (!results[0]) {
                    void performSearch('Pain & fever');
                    return;
                  }
                  void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(directionsAddress(results[0].locationName, results[0].siteDescription))}`);
                }}
              >
                <Text style={styles.directionsText}>Directions</Text>
              </Pressable>
              <Pressable style={styles.reserveButton} onPress={() => results[0] ? router.push(`/reserve/${results[0].inventoryId}`) : void performSearch('Pain & fever')}>
                <Text style={styles.reserveText}>Reserve</Text>
              </Pressable>
            </View>
          </View>
          <Pressable style={styles.featureCard} onPress={() => router.push('/delivery')}>
            <Text style={styles.featureEyebrow}>ON THE WAY</Text>
            <Text style={styles.featureTitle}>Request delivery</Text>
            <Text style={styles.featureText}>Choose your residence hall for a delivery destination.</Text>
            <Text style={styles.comingSoon}>Set delivery location</Text>
          </Pressable>
        </ScrollView>

        {error ? <ErrorState message={error} /> : null}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Checking {campusZone}…</Text>
          </View>
        ) : null}

        {!loading && searched ? (
          <View style={styles.section}>
            <View style={styles.resultsHeader}>
              <Text style={styles.sectionTitle}>Results</Text>
              <Text style={styles.resultCount}>{results.length} found</Text>
            </View>
            {openResults.length ? (
              openResults.map((result, index) => <ResultCard key={result.inventoryId} result={result} rank={index} />)
            ) : otherCampusResults.length ? (
              <>
                <Text style={styles.fallbackText}>Nothing open on {campusZone}. Here are the closest matches on other campuses.</Text>
                {otherCampusResults.map((result, index) => <ResultCard key={result.inventoryId} result={result} rank={index} />)}
              </>
            ) : !error ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Nothing listed on this campus</Text>
                <Text style={styles.emptyText}>
                  Try another product or use Get help for Rutgers Student Health contacts.
                </Text>
              </View>
            ) : null}
            {closedCount > 0 ? (
              <Pressable
                style={styles.closedBox}
                onPress={() => router.push({ pathname: '/closed', params: { campusZone, query, category: activeCategory || '' } })}
              >
                <Text style={styles.closedBoxTitle}>{closedCount} {closedCount === 1 ? 'location is' : 'locations are'} closed</Text>
                <Text style={styles.closedBoxText}>View closed locations</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 48, gap: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  headerCopy: { flex: 1 },
  title: { color: colors.white, fontFamily: fonts.body, fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.8 },
  helpButton: { backgroundColor: colors.accentSoft, paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.pill },
  helpButtonText: { color: colors.primaryDark, fontWeight: '700' },
  cartButton: { backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.pill },
  cartButtonText: { color: colors.ink, fontWeight: '800' },
  welcomeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 24, padding: spacing.md, gap: spacing.sm, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  welcomeMark: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  welcomeMarkText: { color: colors.white, fontWeight: '900' }, welcomeCopy: { flex: 1 }, welcomeTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' }, welcomeText: { color: colors.inkMuted, marginTop: 2 },
  searchPanel: { backgroundColor: colors.surface, borderRadius: 24, padding: spacing.md, gap: spacing.sm, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  label: { color: colors.ink, fontFamily: fonts.body, fontSize: 14, fontWeight: '800', marginTop: 3 },
  chipRow: { gap: spacing.sm, paddingVertical: 2 },
  chip: { backgroundColor: '#D8D3CC', paddingHorizontal: 15, paddingVertical: 10, borderRadius: radius.pill },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: colors.white },
  searchRow: { flexDirection: 'row', gap: spacing.sm },
  input: { flex: 1, minHeight: 46, paddingHorizontal: 14, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface, fontFamily: fonts.body, fontSize: 15 },
  searchButton: { minHeight: 46, justifyContent: 'center', paddingHorizontal: 16, borderRadius: radius.sm, backgroundColor: colors.primary },
  searchButtonText: { color: colors.white, fontWeight: '700', fontSize: 24 },
  askButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.primarySoft }, askText: { color: colors.primaryDark, fontWeight: '800', fontSize: 12 },
  locationButton: { alignSelf: 'flex-start', backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 11, borderRadius: radius.pill },
  locationButtonText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  locationActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  section: { gap: spacing.md },
  sectionTitle: { color: colors.white, fontSize: 21, fontWeight: '900' },
  categoryGrid: { flexDirection: 'row', gap: spacing.sm },
  category: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 15, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  categoryActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  categoryText: { color: colors.ink, fontFamily: fonts.body, fontSize: 13, fontWeight: '700' },
  categoryTextActive: { color: colors.primaryDark },
  loading: { alignItems: 'center', gap: spacing.sm, paddingVertical: 32 },
  loadingText: { color: colors.white, fontWeight: '700' },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  resultCount: { color: '#D7D2CD', fontWeight: '700' },
  empty: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.ink, fontWeight: '900', fontSize: 17 },
  emptyText: { color: colors.inkMuted, lineHeight: 21 },
  fallbackText: { color: colors.white, lineHeight: 21, marginBottom: spacing.sm },
  closedBox: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  closedBoxTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  closedBoxText: { color: colors.primaryDark, fontWeight: '700' },
  carousel: { gap: spacing.md }, featureCard: { width: 292, minHeight: 178, padding: spacing.lg, borderRadius: 24, backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 }, featureEyebrow: { color: colors.primaryDark, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 }, featureTitle: { color: colors.ink, fontSize: 24, fontWeight: '900', marginTop: spacing.sm }, featureText: { color: colors.inkMuted, lineHeight: 20, marginTop: spacing.xs }, featureActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }, directionsButton: { backgroundColor: '#147BFF', paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.sm, justifyContent: 'center' }, directionsText: { color: colors.white, fontWeight: '800' }, reserveButton: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.sm, justifyContent: 'center' }, reserveText: { color: colors.white, fontWeight: '800' }, comingSoon: { color: '#806900', fontWeight: '800', marginTop: spacing.md },
});
