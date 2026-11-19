import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { createCheckout, fetchCartSnapshot } from '@/lib/upskill-api';
import { useSessionStore } from '@/store/session';

type CartViewItem = {
  id: string;
  title: string;
  price: string;
};

export default function CheckoutScreen() {
  const params = useLocalSearchParams<{
    courseId?: string;
    title?: string;
    price?: string;
  }>();
  const router = useRouter();
  const initialized = useSessionStore((state) => state.initialized);
  const profile = useSessionStore((state) => state.profile);
  const roles = useMemo(
    () => (profile?.roles || []).map((role) => String(role).toUpperCase()),
    [profile?.roles],
  );
  const isLearner = roles.includes('LEARNER');

  const expressCourseId = String(params.courseId || '');
  const [cartItems, setCartItems] = useState<CartViewItem[]>([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadCart() {
      if (expressCourseId) {
        const title = String(params.title || 'Selected course');
        const price = String(params.price || '0');
        setCartItems([{ id: expressCourseId, title, price }]);
        setCartTotal(Number(price || 0));
        return;
      }

      try {
        setLoading(true);
        setError('');
        const cart = await fetchCartSnapshot();
        const mapped = (cart.cartItems || []).map((item) => ({
          id: item.id,
          title: item.course?.title || 'Untitled course',
          price: item.course?.price_tier?.price || '0',
        }));
        setCartItems(mapped);
        setCartTotal(Number(cart.cartTotal || 0));
      } catch (e: any) {
        setError(e?.message || 'Unable to load cart');
      } finally {
        setLoading(false);
      }
    }
    loadCart();
  }, [expressCourseId, params.price, params.title]);

  if (initialized && !profile) {
    return <Redirect href="/login" />;
  }

  if (initialized && profile && !isLearner) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <ScrollView contentContainerStyle={{ paddingBottom: 36 }}>
        <View className="px-4 pt-12 pb-3 bg-white border-b border-[#E2E8F0]">
          <Pressable onPress={() => router.back()} className="mb-3 self-start">
            <Text className="text-[#0F766E] font-bold">Back</Text>
          </Pressable>
          <Text className="text-[28px] font-extrabold text-[#0F172A]">Checkout</Text>
          <Text className="text-[#64748B] mt-1">Pay securely with PayPal</Text>
        </View>

        {error ? <Text className="px-4 pt-3 text-[#DC2626]">{error}</Text> : null}
        {loading ? <Text className="px-4 pt-3 text-[#64748B]">Loading order...</Text> : null}

        <View className="px-4 pt-4">
          <View className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
            <Text className="text-[17px] font-extrabold text-[#0F172A]">
              Order details ({cartItems.length})
            </Text>
            {cartItems.map((item) => (
              <View key={item.id} className="mt-3 flex-row justify-between border-t border-[#F1F5F9] pt-3">
                <Text className="text-[#334155] flex-1 pr-3">{item.title}</Text>
                <Text className="font-bold text-[#0F172A]">₱{item.price}</Text>
              </View>
            ))}
          </View>

          <View className="mt-4 rounded-2xl border border-[#E2E8F0] bg-white p-4">
            <Text className="text-[15px] text-[#64748B]">Total</Text>
            <Text className="text-[30px] font-extrabold text-[#0F766E]">₱{cartTotal.toFixed(2)}</Text>
            <Pressable
              disabled={submitting || cartItems.length === 0}
              onPress={async () => {
                try {
                  setSubmitting(true);
                  setError('');
                  const response = await createCheckout(expressCourseId || undefined);
                  const redirectUrl = response?.redirect_url || '';
                  if (!redirectUrl) {
                    throw new Error('Unable to start checkout');
                  }

                  if (String(redirectUrl).startsWith('http')) {
                    await WebBrowser.openBrowserAsync(String(redirectUrl));
                  } else {
                    router.push(String(redirectUrl) as any);
                  }
                } catch (e: any) {
                  setError(e?.message || 'Unable to process checkout');
                } finally {
                  setSubmitting(false);
                }
              }}
              className={`mt-4 rounded-xl py-3 items-center ${
                submitting || cartItems.length === 0 ? 'bg-[#94A3B8]' : 'bg-[#0F766E]'
              }`}>
              <Text className="text-white font-extrabold">
                {submitting ? 'Starting checkout...' : 'Proceed to PayPal'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

