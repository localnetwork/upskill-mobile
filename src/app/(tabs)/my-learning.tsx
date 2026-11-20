import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PLACEHOLDER_COVER } from '@/components/home-feed';
import { CertificatesList, WishlistList } from '@/components/library-extras';
import { SubTabs } from '@/components/dark-ui';
import { fetchMyLearnings, type MyLearning } from '@/lib/upskill-api';

const LAVENDER = '#C0C4FC';
const FILTERS = ['All', 'In progress', 'Completed', 'Not started'] as const;

function pct(item: MyLearning) {
  return Math.min(100, Math.round(Number(item.progress?.progress_pct || 0)));
}

function EnrolledCourses() {
  const router = useRouter();
  const [items, setItems] = useState<MyLearning[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchMyLearnings()
        .then((rows) => !cancelled && setItems(rows))
        .catch((e: any) => !cancelled && setError(e?.message || 'Unable to load your courses'))
        .finally(() => !cancelled && setLoading(false));
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const visible = items.filter((item) => {
    const value = pct(item);
    if (filter === 'In progress') return value > 0 && value < 100;
    if (filter === 'Completed') return value >= 100;
    if (filter === 'Not started') return value === 0;
    return true;
  });

  return (
    <View className="flex-1">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, gap: 12 }}>
        {FILTERS.map((name) => {
          const active = filter === name;
          return (
            <Pressable
              key={name}
              onPress={() => setFilter(name)}
              className={`rounded-full border-2 px-7 py-3.5 ${
                active ? 'border-white bg-white' : 'border-white bg-black'
              }`}>
              <Text className={`text-[18px] font-bold ${active ? 'text-black' : 'text-white'}`}>
                {name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 }}>
        <Text className="mb-6 text-[30px] font-bold text-white">My courses</Text>
        {error ? <Text className="mb-4 text-danger">{error}</Text> : null}
        {loading ? <Text className="text-[#D1D7DC]">Loading your courses...</Text> : null}
        {!loading && visible.length === 0 ? (
          <Text className="text-[16px] text-[#D1D7DC]">No courses here yet.</Text>
        ) : null}

        {visible.map((item) => {
          const course = item.course;
          if (!course) return null;
          const value = pct(item);
          return (
            <Pressable
              key={item.id}
              onPress={() => router.push(`/courses/${encodeURIComponent(course.slug)}`)}
              className="mb-10 flex-row">
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
                {value > 0 ? (
                  <>
                    <View className="mt-2 h-1 overflow-hidden rounded-full bg-[#3E4143]">
                      <View style={{ width: `${value}%`, backgroundColor: LAVENDER }} className="h-1" />
                    </View>
                    <Text className="mt-4 pl-1 text-[17px] text-white">{value}% complete</Text>
                  </>
                ) : (
                  <Text style={{ color: LAVENDER }} className="mt-4 pl-1 text-[18px] font-bold">
                    Start Course
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const SECTIONS = [
  { key: 'learning', label: 'My learning' },
  { key: 'wishlist', label: 'My wishlist' },
  { key: 'certificates', label: 'Certificates' },
] as const;

export default function MyLearningScreen() {
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<(typeof SECTIONS)[number]['key']>('learning');

  return (
    <View className="flex-1 bg-black" style={{ paddingTop: insets.top + 16 }}>
      <Text className="mb-3 px-4 text-[28px] font-bold text-white">My learning</Text>
      <SubTabs tabs={SECTIONS} value={section} onChange={setSection} />
      {section === 'learning' ? <EnrolledCourses /> : null}
      {section === 'wishlist' ? <WishlistList /> : null}
      {section === 'certificates' ? <CertificatesList /> : null}
    </View>
  );
}