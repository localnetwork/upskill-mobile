import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Empty, LAVENDER, PrimaryButton, Sheet, SubTabs } from '@/components/dark-ui';
import {
  BasicsSection,
  CommunitySection,
  CurriculumSection,
  getChecks,
  IntendedLearnersSection,
  INPUT,
  MessagesSection,
  PricingSection,
  PromotionsSection,
  Readiness,
  ReviewsSection,
  StatisticsSection,
  StudentsSection,
} from '@/components/instructor/course-editor';
import {
  fetchCourseManage,
  fetchPayoutSummary,
  setCoursePublished,
  submitCourseForReview,
} from '@/lib/upskill-api';
import { useSessionStore } from '@/store/session';

const TABS = [
  { key: 'intended-learners', label: 'Intended learners' },
  { key: 'curriculum', label: 'Curriculum' },
  { key: 'basics', label: 'Basics' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'promotions', label: 'Promotions' },
  { key: 'statistics', label: 'Statistics' },
  { key: 'students', label: 'Students' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'course-messages', label: 'Course messages' },
  { key: 'community', label: 'Community' },
] as const;

type TabKey = (typeof TABS)[number]['key'];
const EDITING: TabKey[] = ['intended-learners', 'curriculum', 'basics', 'pricing'];

function statusLabel(course: Record<string, any>) {
  const published = course.isPublished ?? course.published;
  if (published === true || ['1', 'true'].includes(String(published).toLowerCase())) return 'Published';
  const wf = String(course.workflowStatus || course.workflow_status || '').toUpperCase();
  return (
    ({
      IN_REVIEW: 'In review',
      PENDING_REVIEW: 'In review',
      SUBMITTED: 'In review',
      APPROVED: 'Approved (unpublished)',
      REJECTED: 'Changes requested',
    } as Record<string, string>)[wf] || 'Unpublished'
  );
}

export default function CourseEditorScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const initialized = useSessionStore((s) => s.initialized);
  const profile = useSessionStore((s) => s.profile);

  const [course, setCourse] = useState<Record<string, any> | null>(null);
  const [sections, setSections] = useState<Record<string, any>[]>([]);
  const [payoutConnected, setPayoutConnected] = useState(false);
  const [tab, setTab] = useState<TabKey>('basics');
  const [failed, setFailed] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!slug) return;
    fetchCourseManage(String(slug))
      .then((c) => {
        setCourse(c);
        setSections(Array.isArray(c.sections) ? c.sections : []);
      })
      .catch(() => setFailed(true));
    fetchPayoutSummary()
      .then((s: any) => setPayoutConnected(!!s?.payoutAccount?.accountNumber))
      .catch(() => undefined);
  }, [slug]);

  const patch = useCallback(
    (next: Record<string, any>) => setCourse((c) => (c ? { ...c, ...next } : c)),
    [],
  );

  if (initialized && !profile) return <Redirect href="/login" />;

  const published = course ? statusLabel(course) === 'Published' : false;
  const approved = course ? statusLabel(course).startsWith('Approved') : false;

  const action = async () => {
    if (!course) return;
    setBusy(true);
    setMessage('');
    try {
      if (published || approved) {
        await setCoursePublished(course.uuid, !published);
        patch({ isPublished: !published, published: !published ? '1' : '0' });
      } else {
        await submitCourseForReview(course.uuid, note.trim());
        patch({ workflowStatus: 'IN_REVIEW' });
      }
      setReviewOpen(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Action failed. Complete the readiness checklist first.');
    } finally {
      setBusy(false);
    }
  };

  const actionLabel = published ? 'Unpublish' : approved ? 'Publish' : 'Request for review';
  const showReadiness = course && EDITING.includes(tab);

  return (
    <View className="flex-1 bg-black" style={{ paddingTop: insets.top }}>
      <View className="border-b border-[#2D2F31] px-4 pb-3 pt-2">
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/dashboard'))}>
          <Text className="text-[15px] font-bold" style={{ color: LAVENDER }}>
            ‹ Back to courses
          </Text>
        </Pressable>
        <Text className="mt-2 text-[20px] font-bold text-white" numberOfLines={2}>
          {course?.title || 'Course'}
        </Text>
        {course ? (
          <View className="mt-2 flex-row flex-wrap items-center gap-2">
            <View className="rounded-full bg-[#2D2F31] px-3 py-1">
              <Text className="text-[12px] font-bold text-white">{statusLabel(course)}</Text>
            </View>
            <Pressable
              onPress={() => router.push(`/courses/${encodeURIComponent(course.slug)}`)}
              className="rounded-full border border-white px-3 py-1">
              <Text className="text-[12px] font-bold text-white">Preview</Text>
            </Pressable>
            <Pressable
              onPress={() => (published || approved ? action() : setReviewOpen(true))}
              disabled={busy}
              className="rounded-full bg-white px-3 py-1">
              <Text className="text-[12px] font-bold text-black">{actionLabel}</Text>
            </Pressable>
          </View>
        ) : null}
        {message ? <Text className="mt-2 text-[13px] text-danger">{message}</Text> : null}
      </View>

      <SubTabs tabs={TABS} value={tab} onChange={setTab} />

      {failed ? (
        <Empty>Unable to load this course.</Empty>
      ) : !course ? (
        <Empty>Loading course…</Empty>
      ) : (
        <ScrollView
          key={tab}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
          <Text className="mb-1 text-[12px] font-bold uppercase text-[#6A6F73]">
            {EDITING.includes(tab) ? 'Course editing' : 'Course management'}
          </Text>
          <Text className="mb-5 text-[24px] font-bold text-white">
            {TABS.find((t) => t.key === tab)?.label}
          </Text>
          {showReadiness ? <Readiness checks={getChecks(course, sections, payoutConnected)} /> : null}
          {tab === 'basics' ? <BasicsSection course={course} onSaved={patch} /> : null}
          {tab === 'intended-learners' ? <IntendedLearnersSection course={course} onSaved={patch} /> : null}
          {tab === 'curriculum' ? (
            <CurriculumSection course={course} onSaved={patch} onSections={setSections} />
          ) : null}
          {tab === 'pricing' ? <PricingSection course={course} onSaved={patch} /> : null}
          {tab === 'promotions' ? <PromotionsSection course={course} /> : null}
          {tab === 'statistics' ? <StatisticsSection course={course} /> : null}
          {tab === 'students' ? <StudentsSection course={course} /> : null}
          {tab === 'reviews' ? <ReviewsSection course={course} /> : null}
          {tab === 'course-messages' ? <MessagesSection course={course} onSaved={patch} /> : null}
          {tab === 'community' ? <CommunitySection course={course} /> : null}
        </ScrollView>
      )}

      <Sheet visible={reviewOpen} title="Request for review" onClose={() => setReviewOpen(false)}>
        <Text className="mb-3 text-[14px] text-[#D1D7DC]">
          Add an optional note for the reviewer. Your course should have a complete readiness checklist.
        </Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="Note to reviewer (optional)"
          placeholderTextColor="#6A6F73"
          className={`${INPUT} mb-4`}
          style={{ minHeight: 90 }}
        />
        {message ? <Text className="mb-3 text-[14px] text-danger">{message}</Text> : null}
        <PrimaryButton label={busy ? 'Submitting…' : 'Submit'} onPress={action} disabled={busy} />
      </Sheet>
    </View>
  );
}
