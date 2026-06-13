import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Api } from '@/lib/api';

type CheckoutStatus = {
  state?: string;
  order?: { id?: string };
  paymentStatus?: string;
  orderStatus?: string;
  paypalStatus?: string;
};

export default function CheckoutSuccessScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [status, setStatus] = useState<CheckoutStatus | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const token = String(params?.token || '');
      if (!token) {
        setError('Missing checkout token.');
        return;
      }
      try {
        const response = await Api.get<any>(`/checkout/status/${encodeURIComponent(token)}`, false);
        setStatus(response?.data || null);
      } catch (e: any) {
        setError(e?.message || 'Unable to load checkout status.');
      }
    }
    load();
  }, [params?.token]);

  const isPaid = status?.state === 'PAID';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: isPaid ? colors.success : colors.text }]}>
        {isPaid ? 'Payment successful' : 'Payment pending'}
      </Text>
      {status?.order?.id ? (
        <Text style={{ color: colors.textSecondary }}>Order #{status.order.id}</Text>
      ) : null}
      <Text style={{ color: colors.textSecondary }}>
        Payment: {status?.paymentStatus || '-'} | Order: {status?.orderStatus || '-'} | PayPal:{' '}
        {status?.paypalStatus || '-'}
      </Text>
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <Link href="/(tabs)" style={[styles.link, { color: colors.primary }]}>
        Go to home
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
