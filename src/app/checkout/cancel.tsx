import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Api } from '@/lib/api';

export default function CheckoutCancelScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function cancelCheckout() {
      const token = String(params?.token || '');
      if (!token) {
        setStatus('error');
        setMessage('Missing checkout token.');
        return;
      }
      try {
        await Api.post('/checkout/cancel', { providerOrderId: token });
        setStatus('ok');
        setMessage('Your checkout was cancelled and items were returned to your cart.');
      } catch (e: any) {
        setStatus('error');
        setMessage(e?.message || 'Unable to cancel checkout.');
      }
    }
    cancelCheckout();
  }, [params?.token]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: status === 'ok' ? colors.text : colors.danger }]}>
        {status === 'ok' ? 'Payment cancelled' : 'Cancellation issue'}
      </Text>
      <Text style={{ color: colors.textSecondary }}>{message || 'Please wait...'}</Text>
      <Link
        href={status === 'ok' ? '/(tabs)/courses' : '/(tabs)'}
        style={[styles.link, { color: colors.primary }]}>
        {status === 'ok' ? 'Continue shopping' : 'Back to home'}
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  link: {
    fontWeight: '700',
    fontSize: 16,
    marginTop: Spacing.one,
  },
});
