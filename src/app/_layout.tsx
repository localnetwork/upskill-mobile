import '@/global.css';

import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { useSessionStore } from '@/store/session';

export default function RootLayout() {
  const hydrate = useSessionStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          width: '100%',
          maxWidth: 430,
          alignSelf: 'center',
        },
      }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="courses/[slug]/index" />
      <Stack.Screen name="courses/[slug]/learn" />
      <Stack.Screen name="checkout/index" />
      <Stack.Screen name="checkout/success" />
      <Stack.Screen name="checkout/cancel" />
      <Stack.Screen name="instructor/dashboard" />
      <Stack.Screen name="instructor/courses/[slug]" />
      <Stack.Screen name="admin/dashboard" />
    </Stack>
  );
}
