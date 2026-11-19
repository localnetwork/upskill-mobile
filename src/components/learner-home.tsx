import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CourseRail,
  PLACEHOLDER_COVER,
  SectionTitle,
  type FeedCourse,
} from '@/components/home-feed';
import {
  fetchCategoryTree,
  fetchCourses,
  fetchMyLearnings,
  type CategoryNode,
  type MyLearning,
} from '@/lib/upskill-api';
import { useSessionStore } from '@/store/session';

const PURPLE = '#A435F0';
const LAVENDER = '#C0C4FC';
const LINE = '#3E4143';

type CategorySection = { category: CategoryNode; courses: FeedCourse[] };

export default function LearnerHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useSessionStore((state) => state.profile);
  const [learnings, setLearnings] = useState<MyLearning[]>([]);
  const [recommended, setRecommended] = useState<FeedCourse[]>([]);
  const [sections, setSections] = useState<CategorySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setError('');
        const [mine, latest, tree] = await Promise.all([
          fetchMyLearnings().catch(() => [] as MyLearning[]),
          fetchCourses({ page: 1, limit: 10 }),
          fetchCategoryTree(),
        ]);
        if (cancelled) return;
        setLearnings(mine);
        setRecommended(latest.rows as FeedCourse[]);

        const results = await Promise.all(
          tree.slice(0, 3).map(async (category) => ({
            category,
            courses: (await fetchCourses({ page: 1, limit: 8, categoryId: category.id }))
              .rows as FeedCourse[],
          })),
        );
        if (!cancelled) setSections(results.filter((section) => section.courses.length > 0));
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Unable to load courses');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const openCourse = (course: FeedCourse) =>
    router.push(`/courses/${encodeURIComponent(course.slug)}`);

  const name = profile?.fullName || profile?.username || 'Learner';
  const current = learnings.find((item) => Number(item.progress?.progress_pct || 0) < 100) || learnings[0];
  const currentCourse = current?.course;
  const progress = Math.min(100, Math.round(Number(current?.progress?.progress_pct || 0)));
  const topPick = recommended[0];

  return (
    <View className="flex-1 bg-black">
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingBottom: 40 }}>
        <Text numberOfLines={1} className="px-4 text-[30px] text-white">
          Welcome back, {name}
        </Text>

        {currentCourse ? (
          <Pressable
            onPress={() => router.push(`/courses/${encodeURIComponent(currentCourse.slug)}`)}
            className="mt-8 px-4"
            style={{ width: 300 }}>
            <Image
              source={{ uri: currentCourse.cover_image?.path || PLACEHOLDER_COVER }}
              style={{ width: 244, height: 137, borderRadius: 2 }}
              resizeMode="cover"
            />
            <Text numberOfLines={2} className="mt-3 text-[18px] font-bold leading-[24px] text-white">
              {currentCourse.title}
            </Text>
            <Text numberOfLines={1} className="mt-1 text-[14px] text-[#D1D7DC]">
              {currentCourse.author?.data?.fullName || 'Instructor'}
            </Text>
            <View className="mt-3 h-1 overflow-hidden rounded-full bg-[#3E4143]" style={{ width: 244 }}>
              <View style={{ width: `${progress}%`, backgroundColor: LAVENDER }} className="h-1" />
            </View>
            <Text className="mt-3 text-[14px] text-white">{progress}% complete</Text>
          </Pressable>
        ) : null}

        <Text className="mb-4 mt-12 px-4 text-[28px] font-bold text-white">Certifications</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          <View
            style={{ borderColor: LINE, width: 332 }}
            className="mr-4 flex-row items-center border p-4">
            <Text className="mr-4 text-[44px] text-white">🎓︎</Text>
            <View className="flex-1">
              <Text className="text-[16px] leading-[22px] text-white">
                Explore content to help you prepare for your certification.
              </Text>
              <Pressable onPress={() => router.push('/(tabs)/courses')} className="mt-4 self-start">
                <Text style={{ color: LAVENDER }} className="text-[16px] font-bold">
                  Explore
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        <Text className="mt-12 px-4 text-[28px] text-white">What to learn next</Text>

        {loading ? <Text className="px-4 pt-6 text-[#D1D7DC]">Loading courses...</Text> : null}
        {error ? <Text className="px-4 pt-6 text-danger">{error}</Text> : null}

        {recommended.length > 0 ? (
          <View className="mt-8">
            <SectionTitle prefix="Recommended courses for you" />
            <CourseRail courses={recommended} onSelect={openCourse} />
          </View>
        ) : null}

        {topPick ? (
          <View className="mt-10">
            <SectionTitle prefix="Our top pick for you" />
            <Pressable onPress={() => openCourse(topPick)} className="mx-4">
              <Image
                source={{ uri: topPick.cover_image?.path || PLACEHOLDER_COVER }}
                style={{ width: '100%', height: 200, borderRadius: 4 }}
                resizeMode="cover"
              />
              <Text numberOfLines={2} className="mt-3 text-[20px] font-bold leading-[26px] text-white">
                {topPick.title}
              </Text>
              <Pressable
                onPress={() => openCourse(topPick)}
                style={{ backgroundColor: PURPLE }}
                className="mt-4 items-center py-4">
                <Text className="text-[17px] font-bold text-white">View course</Text>
              </Pressable>
            </Pressable>
          </View>
        ) : null}

        {sections.map((section) => (
          <View key={section.category.id} className="mt-12">
            <SectionTitle prefix="Top courses in" highlight={section.category.title} />
            <CourseRail courses={section.courses} onSelect={openCourse} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
