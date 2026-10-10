import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ErrorState, Group, LoadingState, Row, StatusText } from '@/components/ui';
import { Screen } from '@/components/screen';
import { colors, spacing } from '@/constants/theme';
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
      <View style={styles.heading}>
        <Text style={styles.title}>{product.productName}</Text>
        {product.activeIngredientOrType ? <Text style={styles.subtitle}>{product.activeIngredientOrType}</Text> : null}
      </View>

      <Group header="About">
        <Row title="Category" value={product.category} />
        <Row title={product.simpleDefinition} />
        {product.typicalUse ? <Row title="Typical use" subtitle={product.typicalUse} /> : null}
      </Group>

      <Group
        header="Label caution"
        footer="Follow the package label. RU Relief does not provide dosing or medical advice."
      >
        <Row title={product.labelCaution} />
      </Group>

      <Group header="Purchase">
        <Row title="Proposed limit" subtitle={product.quantityLimit} />
        <Row title="Retail swipe" subtitle="Pending Rutgers approval for health products" />
      </Group>

      <Group
        header="Proposed campus availability"
        footer={stockedLocations.length ? undefined : 'Not proposed for any campus location.'}
      >
        {stockedLocations.map((location) => (
          <Row
            key={location.inventoryId}
            title={location.locationName}
            subtitle={
              <>
                <StatusText status={location.availability} />
                {` · ${location.campusZone}`}
              </>
            }
            detail={location.reportedConfidence}
            chevron
            onPress={() => router.push(`/location/${location.locationId}`)}
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
