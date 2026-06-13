import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSessionStore } from '@/store/session';

export default function LoginScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const profile = useSessionStore((state) => state.profile);
  const initialized = useSessionStore((state) => state.initialized);
  const login = useSessionStore((state) => state.login);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (initialized && profile) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.text }]}>Login to Upskill</Text>
        <TextInput
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="Username or email"
          autoCapitalize="none"
          style={[styles.input, { borderColor: colors.backgroundElement, color: colors.text }]}
          placeholderTextColor={colors.textSecondary}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          style={[styles.input, { borderColor: colors.backgroundElement, color: colors.text }]}
          placeholderTextColor={colors.textSecondary}
        />
        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
        <Pressable
          onPress={async () => {
            try {
              setLoading(true);
              setError('');
              await login(identifier.trim(), password);
              router.replace('/(tabs)');
            } catch (e: any) {
              setError(e?.message || 'Login failed');
            } finally {
              setLoading(false);
            }
          }}
          style={[styles.button, { backgroundColor: colors.primary }]}>
          <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign in'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    borderRadius: 14,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
