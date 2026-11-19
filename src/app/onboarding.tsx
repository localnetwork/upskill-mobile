import { Redirect, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSessionStore } from '@/store/session';

const SLIDES = [
  {
    key: 'courses',
    icon: '💻',
    title: 'Take Video Courses',
    body: 'From cooking to coding\nand everything in between',
  },
  {
    key: 'instructors',
    icon: '🎨',
    title: 'Learn from the Best',
    body: 'Approachable expert-instructors,\nvetted by thousands of learners',
  },
  {
    key: 'pace',
    icon: '🎬',
    title: 'Go at Your Own Pace',
    body: 'Lifetime access to purchased courses,\nanytime, anywhere',
  },
];

const MAX_WIDTH = 430;

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(windowWidth, MAX_WIDTH);
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const profile = useSessionStore((state) => state.profile);
  const initialized = useSessionStore((state) => state.initialized);
  const enterGuestMode = useSessionStore((state) => state.enterGuestMode);

  if (initialized && profile) {
    return <Redirect href="/(tabs)" />;
  }

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  const handleBrowse = () => {
    enterGuestMode();
    router.replace('/(tabs)');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        style={{ flex: 1 }}>
        {SLIDES.map((slide) => (
          <View
            key={slide.key}
            style={{ width, paddingTop: insets.top }}
            className="items-center justify-center px-8">
            <View className="h-56 w-56 items-center justify-center rounded-full border border-white/20 bg-white/5">
              <Text style={{ fontSize: 96 }}>{slide.icon}</Text>
            </View>
            <View className="mt-16 flex-row gap-3">
              {SLIDES.map((dot, dotIndex) => (
                <View
                  key={dot.key}
                  className={`h-2.5 w-2.5 rounded-full ${
                    dotIndex === index ? 'bg-white' : 'bg-white/40'
                  }`}
                />
              ))}
            </View>
            <Text
              style={{ fontFamily: 'serif' }}
              className="mt-10 text-center text-[28px] font-bold text-white">
              {slide.title}
            </Text>
            <Text className="mt-4 text-center text-[20px] leading-[28px] text-white">
              {slide.body}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View
        style={{ paddingBottom: insets.bottom }}
        className="bg-white">
        <View className="h-20 flex-row">
          <Pressable
            onPress={handleBrowse}
            accessibilityRole="button"
            className="flex-1 items-center justify-center active:bg-slate-100">
            <Text className="text-[20px] font-bold text-slate-900">Browse</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/login')}
            accessibilityRole="button"
            className="flex-1 items-center justify-center active:bg-slate-100">
            <Text className="text-[20px] font-bold text-slate-900">Sign In</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
