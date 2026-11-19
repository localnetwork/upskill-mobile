import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  fetchCategoryTree,
  fetchCourses,
  type CategoryNode,
  type CourseSummary,
} from '@/lib/upskill-api';

export type FeedCourse = CourseSummary & {
  author?: { data?: { fullName?: string } };
  stats?: { average_rating?: number | string; total_reviews?: number | string };
};

type CategorySection = { category: CategoryNode; courses: FeedCourse[] };

export const PLACEHOLDER_COVER = 'https://picsum.photos/seed/upskill-course/640/360';
const HERO_IMAGE = 'https://picsum.photos/seed/upskill-hero/900/700';
const CARD_WIDTH = 270;
const PURPLE = '#A435F0';
const LAVENDER = '#C0C4FC';

function formatPrice(course: FeedCourse) {
  const price = course.price_tier?.price;
  if (!price || Number(price) === 0) return 'Free';
  return `₱${Number(price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

function CourseCard({ course, onPress }: { course: FeedCourse; onPress: () => void }) {
  const rating = Number(course.stats?.average_rating || 0);
  const reviews = Number(course.stats?.total_reviews || 0);
  const filled = Math.round(rating);

  return (
    <Pressable onPress={onPress} style={{ width: CARD_WIDTH, marginRight: 16 }}>
      <Image
        source={{ uri: course.cover_image?.path || PLACEHOLDER_COVER }}
        style={{ width: CARD_WIDTH, height: 152, borderRadius: 4, borderWidth: 1, borderColor: '#2D2F31' }}
        resizeMode="cover"
      />
      <Text numberOfLines={3} className="mt-3 text-[18px] font-bold leading-[24px] text-white">
        {course.title}
      </Text>
      <Text numberOfLines={1} className="mt-1 text-[14px] text-[#D1D7DC]">
        {course.author?.data?.fullName || 'Instructor'}
      </Text>
      <View className="mt-2 flex-row items-center">
        <Text className="mr-1.5 text-[14px] font-bold text-[#E59819]">{rating.toFixed(1)}</Text>
        <View className="flex-row">
          {[1, 2, 3, 4, 5].map((n) => (
            <FontAwesome key={n} name="star" size={12} color={n <= filled ? '#E59819' : '#4A4D50'} style={{ marginRight: 1 }} />
          ))}
        </View>
        <Text className="ml-1.5 text-[14px] text-[#D1D7DC]">({reviews.toLocaleString('en-PH')})</Text>
      </View>
      <Text className="mt-2 text-[20px] font-bold text-white">{formatPrice(course)}</Text>
    </Pressable>
  );
}

export function SectionTitle({ prefix, highlight }: { prefix: string; highlight?: string }) {
  return (
    <Text className="mb-4 px-4 text-[28px] font-bold leading-[34px] text-white">
      {prefix}
      {highlight ? <Text style={{ color: LAVENDER }}> {highlight}</Text> : null}
    </Text>
  );
}

export function CourseRail({
  courses,
  onSelect,
}: {
  courses: FeedCourse[];
  onSelect: (course: FeedCourse) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16 }}>
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} onPress={() => onSelect(course)} />
      ))}
    </ScrollView>
  );
}

export default function HomeFeed() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [bannerVisible, setBannerVisible] = useState(true);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [sections, setSections] = useState<CategorySection[]>([]);
  const [trending, setTrending] = useState<FeedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setError('');
        const [tree, latest] = await Promise.all([
          fetchCategoryTree(),
          fetchCourses({ page: 1, limit: 10 }),
        ]);
        if (cancelled) return;
        setCategories(tree);
        setTrending(latest.rows as FeedCourse[]);

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

  const [firstSection, ...otherSections] = sections;

  return (
    <View className="flex-1 bg-black">
      <View
        style={{ paddingTop: insets.top + 12 }}
        className="flex-row items-center justify-end bg-black px-4 pb-4">
        <Pressable onPress={() => router.push('/login')} hitSlop={8}>
          <Text className="text-[18px] text-white">SIGN IN</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {bannerVisible ? (
          <View className="flex-row items-center justify-between bg-[#5022C3] px-6 py-4">
            <Text className="flex-1 text-center text-[17px] text-white">
              Future-ready skills on your schedule
            </Text>
            <Pressable onPress={() => setBannerVisible(false)} hitSlop={10} accessibilityLabel="Dismiss">
              <FontAwesome name="close" size={20} color="#fff" />
            </Pressable>
          </View>
        ) : null}

        <Image source={{ uri: HERO_IMAGE }} style={{ width: '100%', height: 300 }} resizeMode="cover" />

        <View className="px-4 pt-6">
          <Text style={{ fontFamily: 'serif' }} className="text-[42px] font-bold leading-[48px] text-white">
            Learning that fits
          </Text>
          <Text className="mt-2 text-[19px] text-white">Skills for your present (and future)</Text>

          <Text className="mt-8 text-[30px] font-bold text-white">Thrive in your career</Text>
          <Text className="mt-3 text-[17px] leading-[24px] text-white">
            Access a collection of top-rated courses curated for in demand roles with an Upskill
            subscription
          </Text>
          <Pressable onPress={() => router.push('/(tabs)/courses')} className="mt-5 self-start">
            <Text style={{ color: LAVENDER }} className="text-[18px] font-bold">
              Learn more
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/login')}
            style={{ backgroundColor: PURPLE }}
            className="mt-6 items-center rounded-sm py-4">
            <Text className="text-[20px] font-bold text-white">Start subscription</Text>
          </Pressable>
          <Text className="mt-3 text-center text-[16px] text-white">
            Starting at ₱1,490 per month. Cancel any time.
          </Text>
        </View>

        {loading ? <Text className="px-4 pt-10 text-[#D1D7DC]">Loading courses...</Text> : null}
        {error ? <Text className="px-4 pt-10 text-danger">{error}</Text> : null}

        {firstSection ? (
          <View className="mt-12">
            <SectionTitle prefix="Top courses in" highlight={firstSection.category.title} />
            <CourseRail courses={firstSection.courses} onSelect={openCourse} />
          </View>
        ) : null}

        {categories.length > 0 ? (
          <View className="mt-10">
            <View className="mb-4 flex-row items-center justify-between px-4">
              <Text className="text-[28px] font-bold text-white">Categories</Text>
              <Pressable onPress={() => router.push('/(tabs)/courses')} hitSlop={8}>
                <Text style={{ color: LAVENDER }} className="text-[17px] font-bold">
                  See all
                </Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="px-4">
                {[0, 1].map((row) => (
                  <View key={row} className="mb-3 flex-row" style={{ gap: 12 }}>
                    {categories
                      .filter((_, index) => index % 2 === row)
                      .map((category) => (
                        <Pressable
                          key={category.id}
                          onPress={() => router.push('/(tabs)/courses')}
                          className="rounded-full border-2 border-white px-6 py-4">
                          <Text className="text-[18px] font-bold text-white">{category.title}</Text>
                        </Pressable>
                      ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        ) : null}

        {otherSections.map((section) => (
          <View key={section.category.id} className="mt-10">
            <SectionTitle prefix="Top courses in" highlight={section.category.title} />
            <CourseRail courses={section.courses} onSelect={openCourse} />
          </View>
        ))}

        <View className="mx-4 mt-10 rounded border border-[#3E4143] px-4 py-8">
          <Text style={{ fontFamily: 'serif' }} className="text-center text-[26px] font-bold text-white">
            Top companies trust Upskill
          </Text>
        </View>

        {trending.length > 0 ? (
          <View className="mt-10">
            <SectionTitle prefix="Trending courses" />
            <CourseRail courses={trending} onSelect={openCourse} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
