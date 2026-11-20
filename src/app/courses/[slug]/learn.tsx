import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OutlineButton, SubTabs } from '@/components/dark-ui';
import {
  AnnouncementsTab,
  NotesTab,
  OverviewTab,
  QATab,
  ReviewsTab,
} from '@/components/learn/learn-tabs';
import {
  ArticleLecture,
  LockedLecture,
  QuizLecture,
  VideoLecture,
  WebOnlyLecture,
} from '@/components/learn/lecture-viewers';
import { fetchLearnCourse, sendHeartbeat, type Rec } from '@/lib/learn-api';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'notes', label: 'Notes' },
  { key: 'qa', label: 'Q&A' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'reviews', label: 'Reviews' },
] as const;
type Tab = (typeof TABS)[number]['key'];

const ICON: Record<string, string> = {
  video: '▶',
  article: '☰',
  quiz: '?',
  coding_exercise: '</>',
  assignment: '✎',
  role_play: '☺',
};

const dur = (s: number) => {
  const m = Math.round(Number(s || 0) / 60);
  if (!m) return '';
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}min`;
};

export default function LearnScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<Rec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeId, setActiveId] = useState<string | number | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [panel, setPanel] = useState(true);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let live = true;
    fetchLearnCourse(String(slug))
      .then((c) => {
        if (!live) return;
        setCourse(c);
        const items: Rec[] = (c.sections || []).flatMap((s: Rec) => s.curriculums || []);
        const first = items.find((i) => !i.is_locked) || items[0];
        setActiveId(first?.id ?? null);
        const open: Record<string, boolean> = {};
        (c.sections || []).forEach((s: Rec, i: number) => {
          if ((s.curriculums || []).some((x: Rec) => x.id === first?.id)) open[String(s.id ?? i)] = true;
        });
        setOpenSections(open);
      })
      .catch((e: any) => {
        if (!live) return;
        const status = e?.status;
        if (status === 401) router.replace('/login');
        else if (status === 403 || status === 404) router.replace(`/courses/${slug}` as any);
        else setError(e?.message || 'Unable to load this course.');
      })
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [slug, router]);

  const items: Rec[] = useMemo(
    () => (course?.sections || []).flatMap((s: Rec) => s.curriculums || []),
    [course],
  );
  const index = items.findIndex((i) => i.id === activeId);
  const lecture = index >= 0 ? items[index] : null;

  useEffect(() => {
    if (!lecture?.id || lecture.is_locked) return;
    const t = setInterval(() => sendHeartbeat(lecture.id).catch(() => undefined), 30000);
    return () => clearInterval(t);
  }, [lecture?.id, lecture?.is_locked]);

  const markDone = useCallback((id: string | number) => {
    setCourse((c) =>
      c
        ? {
            ...c,
            sections: (c.sections || []).map((s: Rec) => ({
              ...s,
              curriculums: (s.curriculums || []).map((x: Rec) =>
                x.id === id ? { ...x, is_taken: true, completed: true } : x,
              ),
            })),
          }
        : c,
    );
  }, []);

  const go = (offset: number) => {
    const n = items[index + offset];
    if (n) setActiveId(n.id);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color="#fff" />
      </View>
    );
  }
  if (!course) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black px-6">
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="mb-4 text-center text-white">{error || 'Course not found.'}</Text>
        <OutlineButton label="Go back" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const common = lecture ? { course, lecture, onCompleted: markDone } : null;
  const type = String(lecture?.curriculum_resource_type || '');

  const viewer = !common ? null : lecture?.is_locked ? (
    <LockedLecture lecture={lecture} />
  ) : type === 'video' ? (
    <VideoLecture key={lecture?.id} {...common} />
  ) : type === 'article' ? (
    <ArticleLecture key={lecture?.id} {...common} />
  ) : type === 'quiz' ? (
    <QuizLecture key={lecture?.id} {...common} />
  ) : (
    <WebOnlyLecture {...common} />
  );

  const contentList = (
    <View>
      {(course.sections || []).map((s: Rec, si: number) => {
          const key = String(s.id ?? si);
          const list: Rec[] = s.curriculums || [];
          const done = list.filter((c) => c.is_taken || c.completed).length;
          const total = list.reduce((sum, c) => sum + Number(c.estimated_duration || 0), 0);
          const open = Boolean(openSections[key]);
          return (
            <View key={key} className="mb-2 overflow-hidden rounded-lg border border-[#2D2F31]">
              <Pressable
                onPress={() => setOpenSections((o) => ({ ...o, [key]: !o[key] }))}
                className="flex-row items-center justify-between bg-[#1C1D1F] p-3">
                <View className="flex-1 pr-3">
                  <Text className="text-[14px] font-bold text-white">
                    Section {si + 1}: {s.title}
                  </Text>
                  <Text className="mt-0.5 text-[12px] text-[#6A6F73]">
                    {done}/{list.length}
                    {total ? ` | ${dur(total)}` : ''}
                  </Text>
                </View>
                <Text className="text-white">{open ? '▴' : '▾'}</Text>
              </Pressable>
              {open
                ? list.map((c, ci) => {
                    const active = c.id === activeId;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => {
                          setActiveId(c.id);
                        }}
                        className="flex-row items-center gap-3 border-t border-[#2D2F31] p-3"
                        style={{ backgroundColor: active ? '#2D2F31' : 'transparent' }}>
                        <Text style={{ color: c.is_taken ? '#2E7D32' : '#6A6F73', width: 18 }}>
                          {c.is_taken ? '✓' : c.is_locked ? '🔒' : '○'}
                        </Text>
                        <View className="flex-1">
                          <Text className="text-[14px] text-white">
                            {ci + 1}. {c.title}
                          </Text>
                          <Text className="mt-0.5 text-[12px] text-[#6A6F73]">
                            {ICON[String(c.curriculum_resource_type)] || '•'} {dur(c.estimated_duration)}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })
                : null}
            </View>
          );
        })}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center gap-3 border-b border-[#2D2F31] px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text className="text-[22px] text-white">‹</Text>
        </Pressable>
        <Text className="flex-1 text-[15px] font-bold text-white" numberOfLines={1}>
          {course.title}
        </Text>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
        {viewer}
        <View className="flex-row items-center justify-between border-b border-[#2D2F31] px-4 py-3">
          <Pressable onPress={() => go(-1)} disabled={index <= 0} style={{ opacity: index <= 0 ? 0.3 : 1 }} hitSlop={8}>
            <Text className="text-[14px] font-bold text-white">‹ Previous</Text>
          </Pressable>
          <Text className="text-[12px] text-[#6A6F73]">
            {index + 1} / {items.length}
          </Text>
          <Pressable
            onPress={() => go(1)}
            disabled={index >= items.length - 1}
            style={{ opacity: index >= items.length - 1 ? 0.3 : 1 }}
            hitSlop={8}>
            <Text className="text-[14px] font-bold text-white">Next ›</Text>
          </Pressable>
        </View>
        <View className="px-4 pt-4">
          <Pressable onPress={() => setPanel((p) => !p)} className="flex-row items-center justify-between py-2" hitSlop={6}>
            <Text className="text-[18px] font-bold text-white">Course content</Text>
            <Text className="text-white">{panel ? '?' : '?'}</Text>
          </Pressable>
          {panel ? contentList : null}
        </View>
        <SubTabs tabs={TABS} value={tab} onChange={setTab} />
        <View className="px-4 pt-4">
          {tab === 'overview' ? <OverviewTab course={course} lecture={lecture} /> : null}
          {tab === 'notes' ? <NotesTab /> : null}
          {tab === 'qa' ? <QATab slug={String(slug)} lectureId={lecture?.id} /> : null}
          {tab === 'announcements' ? <AnnouncementsTab courseId={course.id} /> : null}
          {tab === 'reviews' ? <ReviewsTab courseId={course.id} /> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
