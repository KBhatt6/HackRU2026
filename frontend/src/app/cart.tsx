import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, PrimaryButton, SecondaryButton } from '@/components/ui';
import { getCartReservations, getDeliveryRequest, removeCartReservation, subscribeToCart, type CartReservation } from '@/constants/cart';
import { colors, radius, spacing } from '@/constants/theme';
import { Screen } from '@/components/screen';

export default function CartScreen() {
  const [items, setItems] = useState<CartReservation[]>(getCartReservations());
  const [now, setNow] = useState(0);
  const [delivery, setDelivery] = useState(getDeliveryRequest());

  useEffect(() => {
    const unsubscribe = subscribeToCart(() => { setItems([...getCartReservations()]); setDelivery(getDeliveryRequest()); });
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { unsubscribe(); clearInterval(timer); };
  }, []);

  function remaining(expiresAt: string) {
    const seconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Cart' }} />
      <View style={styles.hero}><Text style={styles.title}>Your Cart</Text><Text style={styles.subtitle}>Reserved supplies and their pickup windows.</Text></View>
      {!items.length ? (
        <Card><Text style={styles.emptyTitle}>Your cart is empty</Text><Text style={styles.body}>Reserve a medicine from the results page and it will appear here with its hold timer.</Text><PrimaryButton label="Browse supplies" onPress={() => router.replace('/')} /></Card>
      ) : (
        <>
          {items.map((item) => {
            const time = remaining(item.expiresAt);
            return <Pressable key={item.reservationId} onPress={() => router.push(`/reservation/${item.reservationId}?pickupCode=${encodeURIComponent(item.pickupCode || '')}`)}>
              <Card>
              <Text style={styles.itemName}>{item.productName}</Text>
              <Text style={styles.location}>{item.locationName}</Text>
              <Text style={styles.timer}>{time === '00:00' ? 'Hold expired' : `${time} left on hold`}</Text>
              <Text style={styles.confirmationCode}>Confirmation code: {item.pickupCode || 'View reservation'}</Text>
              <SecondaryButton label="Remove from cart" onPress={() => removeCartReservation(item.reservationId)} />
              </Card>
            </Pressable>;
          })}
          <Card style={styles.deliveryCard}>
            <Text style={styles.deliveryTitle}>{delivery ? 'Delivery Requested' : 'Need these delivered?'}</Text>
            <Text style={styles.body}>Choose an on-campus residence and get these supplies delivered!</Text>
            {delivery ? <View style={styles.deliverySummary}><Text style={styles.deliverySummaryTitle}>DELIVERY CONFIRMATION</Text><Text style={styles.deliverySummaryText}>Code: {delivery.confirmationCode}</Text><Text style={styles.deliverySummaryText}>{delivery.residence}</Text><Text style={styles.deliverySummaryText}>{delivery.campus}</Text><Text style={styles.deliverySummaryText}>{delivery.address}</Text></View> : null}
            <PrimaryButton label={delivery ? 'View Delivery' : 'Request Delivery'} onPress={() => router.push('/delivery')} />
          </Card>
        </>
      )}
      <Text style={styles.disclosure}>Reservations and delivery fulfillment are simulated for this prototype.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingVertical: spacing.md, gap: spacing.xs }, title: { color: colors.white, fontSize: 32, fontWeight: '900' }, subtitle: { color: '#D7D2CD', lineHeight: 21 }, emptyTitle: { color: colors.ink, fontSize: 21, fontWeight: '900' }, body: { color: colors.inkMuted, lineHeight: 21 }, itemName: { color: colors.ink, fontSize: 20, fontWeight: '900' }, location: { color: colors.primaryDark, fontWeight: '800' }, timer: { color: colors.low, fontWeight: '900' }, confirmationCode: { color: colors.primaryDark, fontWeight: '900' }, deliveryCard: { backgroundColor: colors.primarySoft }, deliveryTitle: { color: colors.primaryDark, fontSize: 19, fontWeight: '900' }, deliverySummary: { backgroundColor: colors.surface, borderRadius: radius.sm, padding: spacing.md, gap: spacing.xs }, deliverySummaryTitle: { color: colors.primaryDark, fontWeight: '900', letterSpacing: 1 }, deliverySummaryText: { color: colors.primaryDark, fontWeight: '800' }, disclosure: { color: '#D7D2CD', fontSize: 12, lineHeight: 18 },
});
