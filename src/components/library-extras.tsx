import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';


import { Empty, fmtDate, LAVENDER } from '@/components/dark-ui';
import { PLACEHOLDER_COVER } from '@/components/home-feed';
import { fetchCertificates, fetchWishlist, removeFromWishlist } from '@/lib/upskill-api';

function useList(loader: () => Promise<any[]>) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      loader()
        .then((rows) => !cancelled && setItems(rows))
        .catch((e: any) => !cancelled && setError(e?.message || 'Unable to load'))
        .finally(() => !cancelled && setLoading(false));
      return () => {
        cancelled = true;
      };
    }, [loader]),
  );

  return { items, setItems, loading, error };
}

export function WishlistList() {
  const router = useRouter();
  const { items, setItems, loading, error } = useList(fetchWishlist);

  const remove = async (courseId: string) => {
    const previous = items;
    setItems(items.filter((item) => item?.course?.id !== courseId));
    try {
      await removeFromWishlist(courseId);
    } catch {
      setItems(previous);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 120 }}>
      <Text className="mb-6 text-[30px] font-bold text-white">My wishlist</Text>
      {error ? <Text className="mb-4 text-danger">{error}</Text> : null}
      {loading ? <Text className="text-[#D1D7DC]">Loading wishlist...</Text> : null}
      {!loading && items.length === 0 ? <Empty>Your wishlist is empty.</Empty> : null}
      {items.map((item) => {
        const course = item.course;
        if (!course) return null;
        return (
          <Pressable
            key={item.id}
            onPress={() => router.push(`/courses/${encodeURIComponent(course.slug)}`)}
            className="mb-8 flex-row">
            <Image
              source={{ uri: course.cover_image?.path || PLACEHOLDER_COVER }}
              style={{ width: 76, height: 76, borderRadius: 4 }}
              resizeMode="cover"
            />
            <View className="ml-4 flex-1">
              <Text numberOfLines={2} className="text-[19px] font-bold leading-[24px] text-white">
                {course.title}
              </Text>
              <Text numberOfLines={1} className="mt-1 text-[16px] text-[#D1D7DC]">
                {course.author?.data?.fullName || 'Instructor'}
              </Text>
              <Pressable onPress={() => remove(course.id)} hitSlop={8}>
                <Text style={{ color: LAVENDER }} className="mt-3 text-[16px] font-bold">
                  Remove
                </Text>
              </Pressable>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function CertificatesList() {
  const { items, loading, error } = useList(fetchCertificates);

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 120 }}>
      <Text className="mb-6 text-[30px] font-bold text-white">My certificates</Text>
      {error ? <Text className="mb-4 text-danger">{error}</Text> : null}
      {loading ? <Text className="text-[#D1D7DC]">Loading certificates...</Text> : null}
      {!loading && items.length === 0 ? (
        <Empty>Complete a course to earn your first certificate.</Empty>
      ) : null}
      {items.map((cert) => (
        <View key={cert.slug} className="mb-4 rounded-lg border border-[#2D2F31] p-4">
          <Text numberOfLines={2} className="text-[18px] font-bold text-white">
            {cert.course_title}
          </Text>
          <Text className="mt-2 text-[14px] text-[#D1D7DC]">Issued {fmtDate(cert.issued_at)}</Text>
          <Text className="mt-1 text-[14px] text-[#D1D7DC]">No. {cert.certification_no}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
