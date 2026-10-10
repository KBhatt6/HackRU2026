import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
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
import { CAMPUS_ZONES, CATEGORIES, PROTOTYPE_DISCLOSURE } from '@/constants/config';
import { colors, radius, spacing } from '@/constants/theme';
import { searchInventory } from '@/services/api';
import type { SearchResult } from '@/types/api';

export default function HomeScreen() {
  const [campusZone, setCampusZone] = useState<(typeof CAMPUS_ZONES)[number]>('College Avenue');
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);

  async function addCurrentLocation() {
    setError(null);
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setError('Location permission was not granted. Search still works without walking-time estimates.');
      return;
    }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude });
  }

  async function performSearch(category = activeCategory) {
    if (!query.trim() && !category) {
      setError('Enter a product or choose a category.');
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const response = await searchInventory({
        query: query.trim() || undefined,
        category: query.trim() ? undefined : category || undefined,
        campusZone,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
      });
      setResults(response.results);
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

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>RUTGERS–NEW BRUNSWICK</Text>
            <Text style={styles.title}>RU Relief</Text>
            <Text style={styles.subtitle}>Find campus health supplies before making the trip.</Text>
          </View>
          <Pressable style={styles.helpButton} onPress={() => router.push('/help')}>
            <Text style={styles.helpButtonText}>Get help</Text>
          </Pressable>
        </View>

        <View style={styles.disclosure}>
          <Text style={styles.disclosureTitle}>HackRU prototype</Text>
          <Text style={styles.disclosureText}>{PROTOTYPE_DISCLOSURE}</Text>
        </View>

        <View style={styles.searchPanel}>
          <Text style={styles.label}>Your campus</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {CAMPUS_ZONES.map((zone) => (
              <Pressable
                key={zone}
                onPress={() => setCampusZone(zone)}
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
              <Text style={styles.searchButtonText}>Search</Text>
            </Pressable>
          </View>

          <Pressable style={styles.locationButton} onPress={() => void addCurrentLocation()}>
            <Text style={styles.locationButtonText}>
              {coordinates ? 'Location added for walking estimates' : 'Use my location for walking time'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse by category</Text>
          <View style={styles.categoryGrid}>
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
          </View>
        </View>

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
            {results.length ? (
              results.map((result, index) => <ResultCard key={result.inventoryId} result={result} rank={index} />)
            ) : !error ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Nothing listed on this campus</Text>
                <Text style={styles.emptyText}>
                  Try another product or use Get help for Rutgers Student Health contacts.
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 64, gap: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 38, lineHeight: 43, fontWeight: '900', letterSpacing: -1.2 },
  subtitle: { color: colors.inkMuted, fontSize: 15, lineHeight: 21, maxWidth: 260 },
  helpButton: { backgroundColor: colors.accentSoft, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill },
  helpButtonText: { color: colors.danger, fontWeight: '900' },
  disclosure: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.md, gap: 3 },
  disclosureTitle: { color: colors.primaryDark, fontSize: 13, fontWeight: '900' },
  disclosureText: { color: colors.primaryDark, fontSize: 12, lineHeight: 18 },
  searchPanel: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border },
  label: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: 3 },
  chipRow: { gap: spacing.sm, paddingVertical: 2 },
  chip: { borderColor: colors.border, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 9, borderRadius: radius.pill },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.inkMuted, fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: colors.white },
  searchRow: { flexDirection: 'row', gap: spacing.sm },
  input: { flex: 1, minHeight: 50, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.ink, backgroundColor: colors.background, fontSize: 15 },
  searchButton: { minHeight: 50, justifyContent: 'center', paddingHorizontal: 16, borderRadius: radius.md, backgroundColor: colors.primary },
  searchButtonText: { color: colors.white, fontWeight: '900' },
  locationButton: { alignSelf: 'flex-start', paddingVertical: 8 },
  locationButtonText: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  section: { gap: spacing.md },
  sectionTitle: { color: colors.ink, fontSize: 21, fontWeight: '900' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  category: { width: '48%', flexGrow: 1, minHeight: 54, justifyContent: 'center', padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  categoryActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  categoryText: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  categoryTextActive: { color: colors.primaryDark },
  loading: { alignItems: 'center', gap: spacing.sm, paddingVertical: 32 },
  loadingText: { color: colors.inkMuted, fontWeight: '700' },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  resultCount: { color: colors.inkMuted, fontWeight: '700' },
  empty: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.ink, fontWeight: '900', fontSize: 17 },
  emptyText: { color: colors.inkMuted, lineHeight: 21 },
});
