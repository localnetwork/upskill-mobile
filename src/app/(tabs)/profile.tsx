import { Redirect, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSessionStore } from '@/store/session';

export default function ProfileScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const initialized = useSessionStore((state) => state.initialized);
  const profile = useSessionStore((state) => state.profile);
  const logout = useSessionStore((state) => state.logout);

  if (initialized && !profile) {
    return <Redirect href="/login" />;
  }

  const fullName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.name, { color: colors.text }]}>{fullName || profile?.username}</Text>
        <Text style={{ color: colors.textSecondary }}>{profile?.email}</Text>
      </View>
      <Pressable
        onPress={async () => {
          await logout();
          router.replace('/login');
        }}
        style={[styles.button, { backgroundColor: colors.primary }]}>
        <Text style={styles.buttonText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.three,
  },
  card: {
    borderRadius: 12,
    padding: Spacing.four,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: Spacing.one,
  },
  button: {
    marginTop: Spacing.three,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
