import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function TabsLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        tabBarStyle: { backgroundColor: colors.surface },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarLabel: 'Home' }} />
      <Tabs.Screen name="courses" options={{ title: 'Courses', tabBarLabel: 'Courses' }} />
      <Tabs.Screen
        name="notifications"
        options={{ title: 'Notifications', tabBarLabel: 'Notifications' }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarLabel: 'Profile' }} />
    </Tabs>
  );
}
