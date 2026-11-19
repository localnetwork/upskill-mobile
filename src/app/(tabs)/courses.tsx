import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PLACEHOLDER_COVER, type FeedCourse } from '@/components/home-feed';
import { fetchCategoryTree, fetchCourses, type CategoryNode } from '@/lib/upskill-api';

const LAVENDER = '#C0C4FC';

function formatPrice(course: FeedCourse) {
  const price = course.price_tier?.price;
  if (!price || Number(price) === 0) return 'Free';
  return `₱${Number(price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

export default function DiscoverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [category, setCategory] = useState<CategoryNode | null>(null);
  const [courses, setCourses] = useState<FeedCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCategoryTree()
      .then(setCategories)
      .catch((e: any) => setError(e?.message || 'Unable to load categories'));
  }, []);

  const showingResults = !!submitted || !!category;

  const runSearch = (search: string, cat: CategoryNode | null) => {
    setSubmitted(search);
    setCategory(cat);
    setLoading(true);
    setError('');
    fetchCourses({ page: 1, limit: 30, search: search || undefined, categoryId: cat?.id })
      .then((res) => {
        setCourses(res.rows as FeedCourse[]);
        const count = Number(res.pagination?.total ?? res.pagination?.totalItems);
        setTotal(Number.isFinite(count) && count > 0 ? count : null);
      })
      .catch((e: any) => setError(e?.message || 'Unable to load courses'))
      .finally(() => setLoading(false));
  };
  const reset = () => {
    setQuery('');
    setSubmitted('');
    setCategory(null);
    setCourses([]);
  };

  return (
    <View className="flex-1 bg-black" style={{ paddingTop: insets.top + 16 }}>
      {showingResults ? (
        <View className="mb-4 items-center px-20">
          <Text numberOfLines={1} className="text-[24px] text-white">
            {category ? category.title : `"${submitted}"`}
          </Text>
          <Text className="mt-0.5 text-[16px] text-white">
            {loading ? 'Searching…' : `${total ?? courses.length} results`}
          </Text>
        </View>
      ) : null}

      <View className="flex-row items-center px-4" style={{ gap: 12 }}>
        <View className="h-[52px] flex-1 flex-row items-center rounded-full bg-[#1D1E2C] px-5">
          <FontAwesome name="search" size={18} color="#D1D7DC" style={{ marginRight: 12 }} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => runSearch(query.trim(), null)}
            returnKeyType="search"
            placeholder="Search"
            placeholderTextColor="#D1D7DC"
            className="flex-1 text-[17px] text-white"
          />
        </View>
        {showingResults ? (
          <Pressable
            onPress={reset}
            hitSlop={10}
            className="h-[52px] w-[52px] items-center justify-center rounded-full bg-[#1D1E2C]">
            <FontAwesome name="close" size={18} color="#fff" />
          </Pressable>
        ) : null}
      </View>

      {error ? <Text className="px-4 pt-4 text-danger">{error}</Text> : null}

      {showingResults ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 120 }}>
          {!loading && courses.length === 0 ? (
            <Text className="text-[#D1D7DC]">No courses found.</Text>
          ) : null}
          {courses.map((course) => {
            const rating = Number(course.stats?.average_rating || 0);
            const reviews = Number(course.stats?.total_reviews || 0);
            return (
              <Pressable
                key={course.id}
                onPress={() => router.push(`/courses/${encodeURIComponent(course.slug)}`)}
                className="mb-7 flex-row">
                <Image
                  source={{ uri: course.cover_image?.path || PLACEHOLDER_COVER }}
                  style={{ width: 96, height: 96, borderRadius: 8, borderWidth: 1, borderColor: '#4A4D50' }}
                  resizeMode="cover"
                />
                <View className="ml-4 flex-1">
                  <Text numberOfLines={2} className="text-[19px] leading-[23px] text-white">
                    {course.title}
                  </Text>
                  <Text numberOfLines={1} className="mt-1 text-[16px] text-[#D1D7DC]">
                    {course.author?.data?.fullName || 'Instructor'}
                  </Text>
                  <View className="mt-2 flex-row flex-wrap" style={{ gap: 8 }}>
                    {rating > 0 ? (
                      <View className="flex-row items-center rounded border border-[#4A4D50] px-2.5 py-1">
                        <FontAwesome name="star" size={13} color="#E59819" style={{ marginRight: 6 }} />
                        <Text className="text-[15px] text-white">{rating.toFixed(1)}</Text>
                      </View>
                    ) : null}
                    {reviews > 0 ? (
                      <View className="rounded border border-[#4A4D50] px-2.5 py-1">
                        <Text className="text-[15px] text-white">
                          {reviews.toLocaleString('en-PH')} ratings
                        </Text>
                      </View>
                    ) : null}
                    <View className="rounded border border-[#4A4D50] px-2.5 py-1">
                      <Text className="text-[15px] font-bold text-white">{formatPrice(course)}</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          <Text style={{ color: '#fff' }} className="mt-6 px-4 text-[26px] font-bold">
            Browse categories
          </Text>
          {categories.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => runSearch('', item)}
              className="flex-row items-center justify-between px-4 py-[18px] active:opacity-60">
              <Text className="text-[20px] text-white">{item.title}</Text>
              <FontAwesome name="angle-right" size={26} color={LAVENDER} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
