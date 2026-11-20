import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { Empty, fmtDate, InfoRow, LAVENDER, StatGrid, SubTabs } from '@/components/dark-ui';
import {
  fetchAiInsights,
  fetchAnnouncements,
  fetchInstructorAssignments,
  fetchInstructorMessages,
  fetchInstructorQa,
} from '@/lib/upskill-api';

const SECTIONS = [
  { key: 'qa', label: 'Q&A' },
  { key: 'ai', label: 'AI assistant insights' },
  { key: 'messages', label: 'Messages' },
  { key: 'assignments', label: 'Assignments' },
  { key: 'announcements', label: 'Announcements' },
] as const;
type Section = (typeof SECTIONS)[number]['key'];

const personName = (p: any) => p?.name || p?.fullName || p?.username || 'Learner';
const courseTitle = (c: any) => (typeof c === 'string' ? c : c?.title || 'Course');

function Row({ title, meta, badge, badgeColor }: { title: string; meta?: string; badge?: string; badgeColor?: string }) {
  return (
    <View className="mb-5 border-b border-[#2D2F31] pb-5">
      <Text numberOfLines={2} className="text-[17px] font-bold text-white">
        {title}
      </Text>
      {meta ? (
        <Text numberOfLines={2} className="mt-1 text-[14px] text-[#D1D7DC]">
          {meta}
        </Text>
      ) : null}
      {badge ? (
        <Text style={{ color: badgeColor || LAVENDER }} className="mt-2 text-[14px] font-bold">
          {badge}
        </Text>
      ) : null}
    </View>
  );
}

export default function InstructorCommunication() {
  const [section, setSection] = useState<Section>('qa');
  const [rows, setRows] = useState<any[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const run = async () => {
      if (section === 'ai') return { insights: await fetchAiInsights(), rows: [] as any[] };
      const loader = {
        qa: () => fetchInstructorQa(),
        messages: fetchInstructorMessages,
        assignments: fetchInstructorAssignments,
        announcements: fetchAnnouncements,
      }[section];
      return { insights: null, rows: await loader() };
    };
    run()
      .then((result) => {
        if (cancelled) return;
        setInsights(result.insights);
        setRows(Array.isArray(result.rows) ? result.rows : []);
      })
      .catch((e: any) => !cancelled && setError(e?.message || 'Unable to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [section]));

  return (
    <View>
      <View className="-mx-4 mb-4">
        <SubTabs tabs={SECTIONS} value={section} onChange={setSection} />
      </View>
      {error ? <Text className="mb-3 text-danger">{error}</Text> : null}
      {loading ? <Text className="text-[#D1D7DC]">Loading...</Text> : null}

      {!loading && section === 'qa' ? (
        rows.length ? (
          rows.map((r, i) => (
            <Row
              key={r.id || i}
              title={r.question || r.title || 'Question'}
              meta={`${courseTitle(r.course)} · ${personName(r.learner)} · ${r.repliesCount ?? 0} replies · ${fmtDate(r.createdAt)}`}
              badge={r.isResolved ? 'Resolved' : r.answered ? 'Answered' : 'Needs answer'}
              badgeColor={r.isResolved ? '#22C55E' : undefined}
            />
          ))
        ) : (
          <Empty>No questions from students yet.</Empty>
        )
      ) : null}

      {!loading && section === 'ai' ? (
        insights ? (
          <>
            <StatGrid
              items={[
                { label: 'Total learners', value: String(insights.totalLearners ?? 0) },
                { label: 'At-risk learners', value: String(insights.atRiskLearners ?? 0) },
                { label: 'Unanswered Qs', value: String(insights.unansweredQuestions ?? 0) },
                { label: 'Low reviews (30d)', value: String(insights.lowRatingReviewsLast30Days ?? 0) },
              ]}
            />
            <View className="mt-4">
              <InfoRow label="Top concern" value={String(insights.topConcern || '-')} />
              <InfoRow label="Suggested action" value={String(insights.suggestedAction || '-')} />
            </View>
          </>
        ) : (
          <Empty>No insights available yet.</Empty>
        )
      ) : null}

      {!loading && section === 'messages' ? (
        rows.length ? (
          rows.map((r, i) => (
            <Row
              key={r.id || i}
              title={personName(r.learner)}
              meta={`${r.preview || 'No messages'}${r.lastMessageAt ? ` · ${fmtDate(r.lastMessageAt)}` : ''}`}
              badge={r.needsReply ? 'Needs reply' : r.unreadCount || r.unread ? `${r.unreadCount || 1} unread` : undefined}
            />
          ))
        ) : (
          <Empty>No messages yet.</Empty>
        )
      ) : null}

      {!loading && section === 'assignments' ? (
        rows.length ? (
          rows.map((r, i) => (
            <Row
              key={r.id || i}
              title={r.title || 'Assignment'}
              meta={`${courseTitle(r.course)} · ${r.completedCount ?? 0}/${r.enrolledCount ?? 0} completed · ${r.pendingCount ?? 0} pending`}
            />
          ))
        ) : (
          <Empty>No assignments yet.</Empty>
        )
      ) : null}

      {!loading && section === 'announcements' ? (
        rows.length ? (
          rows.map((r, i) => (
            <Row
              key={r.id || i}
              title={r.subject || 'Announcement'}
              meta={`${r.recipientsCount ?? 0} recipients · ${fmtDate(r.sentAt)}`}
            />
          ))
        ) : (
          <Empty>No announcements sent yet.</Empty>
        )
      ) : null}
    </View>
  );
}
