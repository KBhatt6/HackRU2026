import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/constants/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Home', headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ title: 'Product details', headerBackTitle: 'Home' }} />
        <Stack.Screen name="location/[id]" options={{ title: 'Location details' }} />
        <Stack.Screen name="reserve/[inventoryId]" options={{ title: 'Reserve item' }} />
        <Stack.Screen name="reservation/[id]" options={{ title: 'Your reservation' }} />
        <Stack.Screen name="report/[inventoryId]" options={{ title: 'Report availability' }} />
        <Stack.Screen name="help" options={{ title: 'Get real help' }} />
        <Stack.Screen name="cart" options={{ title: 'Cart' }} />
        <Stack.Screen name="closed" options={{ title: 'Closed locations' }} />
      </Stack>
    </>
  );
}
