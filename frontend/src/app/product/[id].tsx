import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AvailabilityBadge, Card, ErrorState, LoadingState, SectionTitle } from '@/components/ui';
import { Screen } from '@/components/screen';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { getProduct } from '@/services/api';
import type { Product } from '@/types/api';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    setError(null);
    try {
      setProduct(await getProduct(id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load product.');
    }
  }

  useEffect(() => {
    if (!id) return;
    let active = true;
    getProduct(id)
      .then((value) => {
        if (active) setProduct(value);
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Could not load product.');
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (!product && !error) return <LoadingState label="Loading product…" />;
  if (error) return <Screen><ErrorState message={error} onRetry={() => void load()} /></Screen>;
  if (!product) return null;

  const stockedLocations = product.locations?.filter((item) => item.proposedToStock) || [];

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.category}>{product.category.toUpperCase()}</Text>
        <Text style={styles.title}>{product.productName}</Text>
        <Text style={styles.ingredient}>{product.activeIngredientOrType}</Text>
      </View>

      <Card>
        <SectionTitle>What it is</SectionTitle>
        <Text style={styles.body}>{product.simpleDefinition}</Text>
        <Text style={styles.label}>Typical use</Text>
        <Text style={styles.body}>{product.typicalUse}</Text>
      </Card>

      <Card style={styles.cautionCard}>
        <Text style={styles.cautionTitle}>WARNING</Text>
        <Text style={styles.cautionText}>{product.labelCaution}</Text>
        <Text style={styles.cautionText}>Follow the package label. RU Relief does not provide dosing or medical advice.</Text>
      </Card>

      <Text style={styles.sectionHeading}>Proposed campus availability</Text>
      <Text style={styles.limitLine}>Purchase limit - {product.quantityLimit}</Text>
      {(['Busch', 'College Avenue', 'Livingston', 'Cook/Douglass'] as const).map((campus) => {
        const campusLocations = stockedLocations.filter((location) => location.campusZone === campus);
        if (!campusLocations.length) return null;
        return <View key={campus} style={styles.campusGroup}>
          <Text style={styles.campusHeading}>{campus === 'College Avenue' ? 'College Ave' : campus}</Text>
          {campusLocations.map((location) => (
            <Pressable key={location.inventoryId} onPress={() => router.push(`/location/${location.locationId}`)} style={styles.locationCard}>
              <View style={styles.locationCopy}><Text style={styles.locationName}>{location.locationName}</Text><Text style={styles.locationZone}>{location.reportedConfidence}</Text></View>
              <AvailabilityBadge status={location.availability} />
            </Pressable>
          ))}
        </View>;
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingVertical: spacing.md, gap: spacing.xs },
  category: { color: '#FF7A8E', fontFamily: fonts.body, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: colors.white, fontFamily: fonts.body, fontSize: 32, lineHeight: 38, fontWeight: '900' },
  ingredient: { color: '#D7D2CD', fontFamily: fonts.body, fontSize: 16 },
  label: { color: colors.ink, fontFamily: fonts.body, fontSize: 13, fontWeight: '900', marginTop: spacing.xs },
  body: { color: colors.inkMuted, fontFamily: fonts.body, fontSize: 15, lineHeight: 23 },
  cautionCard: { backgroundColor: colors.lowSoft, borderColor: colors.low, borderWidth: 2 },
  cautionTitle: { color: colors.low, fontFamily: fonts.body, fontWeight: '900', fontSize: 18, letterSpacing: 2 },
  cautionText: { color: colors.low, fontFamily: fonts.body, lineHeight: 21 },
  sectionHeading: { color: colors.white, fontFamily: fonts.body, fontSize: 20, lineHeight: 26, fontWeight: '800' },
  limitLine: { color: '#F4EBDD', fontFamily: fonts.body, fontSize: 13, lineHeight: 18, marginTop: -spacing.sm },
  campusGroup: { gap: spacing.sm },
  campusHeading: { color: colors.white, fontSize: 19, fontWeight: '900', marginTop: spacing.sm },
  locationCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  locationCopy: { flex: 1, gap: 2 },
  locationName: { color: colors.ink, fontWeight: '900', fontSize: 16 },
  locationZone: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  confidence: { color: colors.inkMuted, fontSize: 12 },
});
