import { Link, Redirect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSessionStore } from '@/store/session';

export default function HomeScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const initialized = useSessionStore((state) => state.initialized);
  const profile = useSessionStore((state) => state.profile);

  if (initialized && !profile) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.text }]}>Upskill Mobile</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Same platform, now optimized for mobile.
        </Text>
        <Link href="/(tabs)/courses" style={[styles.link, { color: colors.primary }]}>
          Browse courses
        </Link>
        <Link href="/(tabs)/notifications" style={[styles.link, { color: colors.primary }]}>
          Open notifications
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.four,
  },
  card: {
    borderRadius: 12,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 15,
  },
  link: {
    marginTop: Spacing.one,
    fontSize: 16,
    fontWeight: '700',
  },
});
