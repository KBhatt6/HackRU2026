import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { ResultCard } from '@/components/result-card';
import { Card, ErrorState, LoadingState } from '@/components/ui';
import { Screen } from '@/components/screen';
import { colors, radius, spacing } from '@/constants/theme';
import { searchInventory } from '@/services/api';
import type { SearchResult } from '@/types/api';

export default function ClosedLocationsScreen() {
  const { campusZone, query, category } = useLocalSearchParams<{ campusZone?: string; query?: string; category?: string }>();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const search = query || category;
    if (!search) return;
    searchInventory({
      query: query || undefined,
      category: query ? undefined : category || undefined,
      campusZone: campusZone || 'College Avenue',
    })
      .then((response) => setResults(response.results.filter((result) => result.isOpen !== true)))
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Could not load closed locations.'));
  }, [campusZone, category, query]);

  if (error) return <Screen><ErrorState message={error} /></Screen>;
  if (!query && !category) return <Screen><ErrorState message="Choose a product or category first." /></Screen>;
  if (!results.length) return <LoadingState label="Loading closed locations…" />;

  return (
    <Screen>
      <Card style={styles.warningCard}>
        <Text style={styles.warningTitle}>Need help while stores are closed?</Text>
        <Text style={styles.warningText}>The RSH Advice Nurse can help with non-urgent medication questions.</Text>
        <Pressable style={styles.helpButton} onPress={() => router.replace('/help')}>
          <Text style={styles.helpButtonText}>Get help</Text>
        </Pressable>
      </Card>
      <Text style={styles.heading}>Closed locations</Text>
      {results.map((result, index) => <ResultCard key={result.inventoryId} result={result} rank={index} />)}
    </Screen>
  );
}

const styles = StyleSheet.create({
  warningCard: { backgroundColor: colors.dangerSoft, borderColor: colors.primary, borderWidth: 2 },
  warningTitle: { color: colors.primaryDark, fontWeight: '900', fontSize: 18 },
  warningText: { color: colors.ink, lineHeight: 21 },
  helpButton: { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10, marginTop: spacing.xs },
  helpButtonText: { color: colors.white, fontWeight: '800' },
  heading: { color: colors.white, fontSize: 22, fontWeight: '900' },
});
