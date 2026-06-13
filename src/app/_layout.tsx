import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { useSessionStore } from '@/store/session';

export default function RootLayout() {
  const hydrate = useSessionStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
      <Stack.Screen name="checkout/success" />
      <Stack.Screen name="checkout/cancel" />
    </Stack>
  );
}
