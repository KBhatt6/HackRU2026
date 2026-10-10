import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/constants/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.tint,
          headerTitleStyle: { color: colors.ink, fontWeight: '600' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ title: 'Product' }} />
        <Stack.Screen name="location/[id]" options={{ title: 'Location' }} />
        <Stack.Screen name="reserve/[inventoryId]" options={{ title: 'Reserve' }} />
        <Stack.Screen name="reservation/[id]" options={{ title: 'Reservation' }} />
        <Stack.Screen name="report/[inventoryId]" options={{ title: 'Report Stock' }} />
        <Stack.Screen name="help" options={{ title: 'Get Help' }} />
      </Stack>
    </>
  );
}
