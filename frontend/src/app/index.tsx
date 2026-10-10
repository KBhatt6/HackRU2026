import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import {
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
import { ErrorState, Footnote, Group, LoadingState, Row } from '@/components/ui';
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

  async function performSearch(category = activeCategory, zone = campusZone) {
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
        campusZone: zone,
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

  function chooseCampusZone(zone: (typeof CAMPUS_ZONES)[number]) {
    setCampusZone(zone);
    if (query.trim() || activeCategory) {
      void performSearch(activeCategory, zone);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>RU Relief</Text>
          <Pressable hitSlop={8} onPress={() => router.push('/help')}>
            <Text style={styles.helpLink}>Get Help</Text>
          </Pressable>
        </View>

        <View style={styles.searchField}>
          <TextInput
            value={query}
            onChangeText={(value) => {
              setQuery(value);
              if (value) setActiveCategory(null);
            }}
            onSubmitEditing={() => void performSearch(null)}
            placeholder="Search Tylenol, Advil, thermometer"
            placeholderTextColor={colors.inkMuted}
            returnKeyType="search"
            clearButtonMode="while-editing"
            style={styles.input}
          />
        </View>

        <View style={styles.segmented} accessibilityRole="tablist">
          {CAMPUS_ZONES.map((zone) => {
            const selected = campusZone === zone;
            return (
              <Pressable
                key={zone}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => chooseCampusZone(zone)}
                style={[styles.segment, selected && styles.segmentSelected]}
              >
                <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                  {zone === 'College Avenue' ? 'College Ave' : zone}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Group footer="Your location is sent with searches to estimate walking time.">
          <Row
            title="Walking times"
            value={coordinates ? 'On' : 'Use my location'}
            onPress={() => void addCurrentLocation()}
          />
        </Group>

        {error ? <ErrorState message={error} /> : null}

        {loading ? <LoadingState label={`Checking ${campusZone}…`} /> : null}

        {!loading && searched ? (
          <>
            {results.length ? (
              results.map((result, index) => <ResultCard key={result.inventoryId} result={result} rank={index} />)
            ) : !error ? (
              <Group footer="Try another product, or use Get Help for Rutgers Student Health contacts.">
                <Row title="Nothing listed on this campus" />
              </Group>
            ) : null}
            {results.length ? (
              <Footnote>
                {results.length} {results.length === 1 ? 'result' : 'results'} on {campusZone}, best match first.
              </Footnote>
            ) : null}
          </>
        ) : null}

        <Group header="Categories">
          {CATEGORIES.map((category) => (
            <Row
              key={category}
              title={category}
              checked={activeCategory === category}
              chevron={activeCategory !== category}
              onPress={() => chooseCategory(category)}
            />
          ))}
        </Group>

        <Footnote>{PROTOTYPE_DISCLOSURE}</Footnote>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.md, paddingBottom: 64, gap: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.sm },
  title: { color: colors.ink, fontSize: 34, lineHeight: 41, fontWeight: '700' },
  helpLink: { color: colors.tint, fontSize: 17 },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginTop: -spacing.sm,
  },
  input: { flex: 1, color: colors.ink, fontSize: 17, paddingVertical: 8 },
  segmented: { flexDirection: 'row', padding: 2, borderRadius: radius.sm, backgroundColor: colors.surface, marginTop: -spacing.sm },
  segment: { flexGrow: 1, paddingVertical: 6, paddingHorizontal: 6, borderRadius: 7, alignItems: 'center' },
  segmentSelected: { backgroundColor: colors.surfacePressed },
  segmentText: { color: colors.ink, fontSize: 13 },
  segmentTextSelected: { fontWeight: '600' },
});
