import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Share, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppModal } from "@/components/app-modal";
import {
  addCourseToCart,
  fetchCourseRoute,
  type CourseDetail,
} from "@/lib/upskill-api";
import { useSessionStore } from "@/store/session";

const PURPLE = "#A435F0";
const LAVENDER = "#C0C4FC";
const LINE = "#3E4143";

function stripHtml(html?: string) {
  return (html || "")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function OutlineButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center justify-center border border-white py-4 active:opacity-70"
    >
      <Text className="text-[16px] font-bold text-white">{label}</Text>
    </Pressable>
  );
}

function Heading({ children }: { children: string }) {
  return (
    <Text className="mb-4 text-[22px] font-bold text-white">{children}</Text>
  );
}

export default function CourseDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useSessionStore((state) => state.profile);
  const roles = useMemo(
    () => (profile?.roles || []).map((role) => String(role).toUpperCase()),
    [profile?.roles],
  );
  const isLearner = roles.includes("LEARNER");

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [descExpanded, setDescExpanded] = useState(false);
  const [cartModal, setCartModal] = useState(false);

  useEffect(() => {
    const currentSlug = String(slug || "");
    if (!currentSlug) return;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await fetchCourseRoute(currentSlug);
        setCourse(data);
        const firstId = data.sections?.[0]?.id;
        if (firstId) setOpenSections({ [firstId]: true });
      } catch (e: any) {
        setError(e?.message || "Unable to load course");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  const requireLogin = () => router.push("/login");

  const buyNow = () => {
    if (!course) return;
    if (!profile) return requireLogin();
    if (!isLearner) return;
    router.push({
      pathname: "/checkout",
      params: {
        courseId: course.id,
        slug: course.slug,
        title: course.title,
        price: course.price_tier?.price || "",
      },
    });
  };

  const addToCart = async () => {
    if (!course) return;
    if (!profile) return requireLogin();
    if (!isLearner || course.is_in_cart) return;
    try {
      await addCourseToCart(course.id);
      setCourse((prev) => (prev ? { ...prev, is_in_cart: true } : prev));
      setCartModal(true);
    } catch (e: any) {
      setError(e?.message || "Unable to add course to cart");
    }
  };

  const continueLearning = () => {
    if (!course) return;
    router.push(`/courses/${course.slug}/learn` as any);
  };

  const price = course?.price_tier?.price;
  const priceLabel =
    !price || Number(price) === 0
      ? "Free"
      : `₱${Number(price).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
  const description = stripHtml(course?.description);
  const author =
    course?.author?.data?.fullName ||
    course?.author?.data?.username ||
    "Upskill Educator";
  const lessonCount = course?.resources_count?.curriculum_count || 0;
  const sectionCount = course?.resources_count?.section_count || 0;
  const objectives = course?.goals?.objectives?.filter(Boolean) || [];
  const requirements = course?.goals?.requirements?.filter(Boolean) || [];
  const audience = course?.goals?.targetAudience?.filter(Boolean) || [];
  let lessonNumber = 0;

  return (
    <View className="flex-1 bg-black">
      <View
        style={{ paddingTop: insets.top + 8 }}
        className="flex-row items-center justify-between bg-black px-4 pb-3"
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityLabel="Back"
        >
          <FontAwesome name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <View className="flex-row items-center" style={{ gap: 24 }}>
          <Pressable
            hitSlop={10}
            onPress={() =>
              course && Share.share({ message: `${course.title} on Upskill` })
            }
            accessibilityLabel="Share"
          >
            <Text className="text-[26px] text-white">⤴</Text>
          </Pressable>
          <Pressable
            hitSlop={10}
            onPress={() =>
              profile ? router.push("/checkout") : requireLogin()
            }
            accessibilityLabel="Cart"
          >
            <Text className="text-[26px] text-white">🛒︎</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        {error ? <Text className="px-4 pt-3 text-danger">{error}</Text> : null}
        {loading ? (
          <Text className="px-4 pt-3 text-[#D1D7DC]">Loading course...</Text>
        ) : null}

        {course ? (
          <View className="px-4 pt-3">
            <View style={{ height: 210, borderRadius: 4, overflow: "hidden" }}>
              <Image
                source={{
                  uri:
                    course.cover_image?.path ||
                    "https://picsum.photos/seed/upskill-detail/900/500",
                }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
              <View className="absolute inset-0 items-center justify-center bg-black/25">
                <View className="h-16 w-16 items-center justify-center rounded-full bg-white/90">
                  <FontAwesome name="play" size={22} color="#000" style={{ marginLeft: 4 }} />
                </View>
                <Text className="mt-2 text-[16px] font-bold text-white">
                  Preview this course
                </Text>
              </View>
            </View>

            <Text className="mt-5 text-[28px] leading-[36px] text-white">
              {course.title}
            </Text>
            {course.subtitle ? (
              <Text className="mt-3 text-[18px] leading-[26px] text-[#D1D7DC]">
                {course.subtitle}
              </Text>
            ) : null}

            <View className="mt-5 flex-row items-center" style={{ gap: 12 }}>
              {course.instructional_level?.title ? (
                <View className="rounded-sm bg-[#ECEB98] px-3 py-1.5">
                  <Text className="text-[14px] font-bold text-[#3D3C0A]">
                    {course.instructional_level.title}
                  </Text>
                </View>
              ) : null}
              {course.category?.title || course.category?.name ? (
                <Text className="text-[14px] text-[#D1D7DC]">
                  {course.category?.title || course.category?.name}
                </Text>
              ) : null}
            </View>

            <Text className="mt-4 text-[15px] text-white">
              Created by{" "}
              <Text
                style={{ color: LAVENDER, textDecorationLine: "underline" }}
              >
                {author}
              </Text>
            </Text>
            <Text className="mt-3 text-[15px] text-[#D1D7DC]">
              {sectionCount} sections • {lessonCount} lectures
            </Text>

            <Text className="mt-6 text-[30px] font-bold text-white">
              {priceLabel}
            </Text>

            {course.is_enrolled ? (
              <Pressable
                onPress={continueLearning}
                style={{ backgroundColor: PURPLE }}
                className="mt-5 items-center py-4 active:opacity-80"
              >
                <Text className="text-[18px] font-bold text-white">
                  Continue learning
                </Text>
              </Pressable>
            ) : (
              <>
                <Pressable
                  onPress={buyNow}
                  style={{ backgroundColor: PURPLE }}
                  className="mt-5 items-center py-4 active:opacity-80"
                >
                  <Text className="text-[18px] font-bold text-white">
                    Buy now
                  </Text>
                </Pressable>
                <View className="mt-3 flex-row" style={{ gap: 12 }}>
                  <OutlineButton
                    label={course.is_in_cart ? "In cart" : "Add to cart"}
                    onPress={addToCart}
                  />
                  {!isLearner ? (
                    <OutlineButton label="Add to wishlist" onPress={requireLogin} />
                  ) : null}
                </View>
              </>
            )}

            {!profile ? (
              <>
                <View className="my-6 flex-row items-center">
                  <View
                    style={{ backgroundColor: LINE }}
                    className="h-px flex-1"
                  />
                  <Text className="mx-3 text-[14px] text-[#D1D7DC]">or</Text>
                  <View
                    style={{ backgroundColor: LINE }}
                    className="h-px flex-1"
                  />
                </View>
                <Text className="text-[22px] font-bold text-white">
                  Subscribe to Upskill’s top courses
                </Text>
                <Text className="mt-3 text-[17px] leading-[24px] text-white">
                  Get this course plus top-rated picks in popular topics.
                </Text>
                <Pressable
                  onPress={requireLogin}
                  style={{ backgroundColor: PURPLE }}
                  className="mt-5 items-center py-4 active:opacity-80"
                >
                  <Text className="text-[18px] font-bold text-white">
                    Start subscription
                  </Text>
                </Pressable>
                <Text className="mt-3 text-center text-[13px] text-[#D1D7DC]">
                  Starting at ₱1,490 per month. Cancel any time.
                </Text>
              </>
            ) : null}

            {objectives.length > 0 ? (
              <View className="mt-10">
                <Heading>What you’ll learn</Heading>
                {objectives.map((item, index) => (
                  <View key={index} className="mb-4 flex-row">
                    <FontAwesome name="check" size={14} color="#D1D7DC" style={{ marginRight: 12, marginTop: 3 }} />
                    <Text className="flex-1 text-[16px] leading-[24px] text-white">
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {(course.sections || []).length > 0 ? (
              <View className="mt-8">
                <Heading>Course content</Heading>
                <Text className="mb-3 text-[14px] text-[#D1D7DC]">
                  {sectionCount} sections • {lessonCount} lectures
                </Text>
                {(course.sections || []).map((section) => {
                  const open = !!openSections[section.id];
                  return (
                    <View
                      key={section.id}
                      style={{ borderTopWidth: 1, borderTopColor: LINE }}
                    >
                      <Pressable
                        onPress={() =>
                          setOpenSections((prev) => ({
                            ...prev,
                            [section.id]: !open,
                          }))
                        }
                        className="flex-row items-center justify-between py-5"
                      >
                        <Text className="mr-4 flex-1 text-[17px] text-white">
                          {section.title}
                        </Text>
                        <Text className="text-[22px] text-white">
                          {open ? "−" : "+"}
                        </Text>
                      </Pressable>
                      {open
                        ? (section.curriculums || []).map((curriculum) => {
                            lessonNumber += 1;
                            return (
                              <View
                                key={curriculum.id}
                                className="mb-5 flex-row"
                              >
                                <Text className="w-9 text-[16px] text-white">
                                  {lessonNumber}
                                </Text>
                                <View className="flex-1">
                                  <Text className="text-[16px] leading-[22px] text-white">
                                    {curriculum.title}
                                  </Text>
                                  {curriculum.curriculum_resource_type ? (
                                    <Text className="mt-1 text-[13px] capitalize text-[#D1D7DC]">
                                      {curriculum.curriculum_resource_type.toLowerCase()}
                                    </Text>
                                  ) : null}
                                </View>
                              </View>
                            );
                          })
                        : null}
                    </View>
                  );
                })}
                <View style={{ borderTopWidth: 1, borderTopColor: LINE }} />
              </View>
            ) : null}

            {requirements.length > 0 ? (
              <View className="mt-8">
                <Heading>Requirements</Heading>
                {requirements.map((item, index) => (
                  <View key={index} className="mb-4 flex-row">
                    <Text className="mr-3 text-[16px] text-[#D1D7DC]">•</Text>
                    <Text className="flex-1 text-[16px] leading-[24px] text-white">
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {description ? (
              <View className="mt-8">
                <Heading>Description</Heading>
                <Text
                  numberOfLines={descExpanded ? undefined : 8}
                  className="text-[16px] leading-[24px] text-white"
                >
                  {description}
                </Text>
                <Pressable
                  onPress={() => setDescExpanded((v) => !v)}
                  className="mt-3 self-start"
                >
                  <Text
                    style={{ color: LAVENDER }}
                    className="text-[16px] font-bold"
                  >
                    {descExpanded ? "Show less" : "Show more"}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {audience.length > 0 ? (
              <View className="mt-8">
                <Heading>Who this course is for</Heading>
                {audience.map((item, index) => (
                  <View key={index} className="mb-4 flex-row">
                    <Text className="mr-3 text-[16px] text-[#D1D7DC]">•</Text>
                    <Text className="flex-1 text-[16px] leading-[24px] text-white">
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View className="mt-8">
              <Heading>Instructor</Heading>
              <Text className="text-[18px] font-bold text-white">{author}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
      <AppModal
        visible={cartModal}
        icon="shopping-cart"
        title="Added to cart"
        message={course?.title}
        primaryLabel="Go to checkout"
        onPrimary={() => {
          setCartModal(false);
          buyNow();
        }}
        secondaryLabel="Keep browsing"
        onClose={() => setCartModal(false)}
      />
    </View>
  );
}
