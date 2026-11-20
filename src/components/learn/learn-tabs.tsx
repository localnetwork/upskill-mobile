import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Chips, Empty, fmtDate, LAVENDER, OutlineButton, PrimaryButton, StatGrid } from '@/components/dark-ui';
import { htmlToText } from '@/components/instructor/editor-kit';
import {
  createDiscussion,
  fetchAnnouncementComments,
  fetchAnnouncements,
  fetchDiscussion,
  fetchDiscussions,
  fetchLearnReviews,
  postAnnouncementComment,
  replyToDiscussion,
  resolveDiscussion,
  voteDiscussion,
  type Rec,
} from '@/lib/learn-api';

const BOX = 'rounded-lg border border-[#2D2F31] bg-[#1C1D1F] p-4';
const INPUT = 'rounded-md border border-[#6A6F73] bg-black px-4 py-3 text-[15px] text-white';
const author = (a?: Rec) => a?.fullName || a?.username || 'User';
const when = (v?: string) => (v ? new Date(v).toLocaleString() : '');

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text className="text-[14px] font-bold" style={{ color: LAVENDER }}>
        {label}
      </Text>
    </Pressable>
  );
}

/* ---------- Overview ---------- */

export function OverviewTab({ course, lecture }: { course: Rec; lecture: Rec | null }) {
  const all: Rec[] = (course.sections || []).flatMap((s: Rec) => s.curriculums || []);
  const done = all.filter((c) => c.completed || c.is_taken || Number(c.progress_pct || 0) >= 100).length;
  const seconds = all.reduce((sum, c) => sum + Number(c.estimated_duration || 0), 0);
  const mins = Math.round(seconds / 60);
  const duration = !seconds ? 'N/A' : mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${Math.max(1, mins)}m`;
  const stats = course.stats || {};
  const topics: Rec[] = (Array.isArray(lecture?.topics) && lecture.topics.length ? lecture.topics : lecture?.topic ? [lecture.topic] : []).filter(
    (t: Rec) => t?.title,
  );
  const [more, setMore] = useState(false);
  const description = htmlToText(String(course.description || ''));
  const instructor = course.author?.data || course.author || {};

  return (
    <View>
      <Text className="text-[20px] font-bold text-white">{course.title}</Text>
      {course.subtitle ? <Text className="mt-1 text-[14px] text-[#D1D7DC]">{course.subtitle}</Text> : null}
      <View className="my-4">
        <StatGrid
          items={[
            { label: 'Progress', value: `${done}/${all.length}` },
            { label: 'Rating', value: Number(stats.average_rating || 0).toFixed(1) },
            { label: 'Students', value: String(Number(stats.total_enrollees || 0)) },
            { label: 'Duration', value: duration },
          ]}
        />
      </View>
      <Text className="mb-1 text-[13px] text-[#6A6F73]">
        {course.instructional_level?.title || 'All Levels'} · {course.language || 'English'}
      </Text>
      {topics.length ? (
        <Text className="mb-3 text-[13px] text-[#D1D7DC]">Topics: {topics.map((t) => t.title).join(', ')}</Text>
      ) : null}
      {description ? (
        <View className="mt-3">
          <Text className="mb-1 text-[16px] font-bold text-white">About this course</Text>
          <Text className="text-[14px] leading-[22px] text-[#D1D7DC]" numberOfLines={more ? undefined : 6}>
            {description}
          </Text>
          <View className="mt-2">
            <Link label={more ? 'Show less' : 'Show more'} onPress={() => setMore((m) => !m)} />
          </View>
        </View>
      ) : null}
      {instructor.fullName || instructor.username ? (
        <View className={`${BOX} mt-5`}>
          <Text className="text-[12px] uppercase text-[#6A6F73]">Instructor</Text>
          <Text className="mt-1 text-[16px] font-bold text-white">{author(instructor)}</Text>
          {instructor.headline ? <Text className="mt-1 text-[13px] text-[#D1D7DC]">{instructor.headline}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

/* ---------- Notes (placeholder on web as well) ---------- */

export function NotesTab() {
  return <Empty>Notes are coming soon.</Empty>;
}

/* ---------- Q&A ---------- */

const STATUS = [
  { key: 'all', label: 'All status' },
  { key: 'open', label: 'Open' },
  { key: 'resolved', label: 'Resolved' },
] as const;
const CATS = [
  { key: 'COURSE_CONTENT', label: 'Course content' },
  { key: 'SOMETHING_ELSE', label: 'Something else' },
] as const;
const SORT = [
  { key: 'newest', label: 'Newest' },
  { key: 'most_upvoted', label: 'Most upvoted' },
  { key: 'oldest', label: 'Oldest' },
] as const;

export function QATab({ slug, lectureId }: { slug: string; lectureId?: string | number }) {
  const [threads, setThreads] = useState<Rec[]>([]);
  const [canModerate, setCanModerate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'all' | 'open' | 'resolved'>('all');
  const [sort, setSort] = useState<'newest' | 'most_upvoted' | 'oldest'>('newest');
  const [asking, setAsking] = useState(false);
  const [category, setCategory] = useState<'COURSE_CONTENT' | 'SOMETHING_ELSE'>('COURSE_CONTENT');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selected, setSelected] = useState<Rec | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await fetchDiscussions(slug, { lessonId: lectureId, status, category: 'all', sort });
      setThreads(r.threads);
      setCanModerate(r.canModerate);
    } catch {
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [slug, lectureId, status, sort]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const open = async (id: string) => {
    setSelected({ id, loading: true });
    try {
      setSelected(await fetchDiscussion(id));
    } catch {
      setSelected(null);
    }
  };

  const patchThread = (id: string, patch: Rec) => {
    setThreads((l) => l.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    setSelected((s) => (s && s.id === id ? { ...s, ...patch } : s));
  };

  const vote = async (t: Rec) => {
    const next = !t.hasUpvoted;
    patchThread(t.id, { hasUpvoted: next, upvotesCount: Math.max(0, Number(t.upvotesCount || 0) + (next ? 1 : -1)) });
    try {
      const v = await voteDiscussion(t.id, next);
      if (v?.threadId === t.id) patchThread(t.id, { hasUpvoted: Boolean(v.hasUpvoted), upvotesCount: Number(v.upvotesCount || 0) });
    } catch {
      patchThread(t.id, { hasUpvoted: t.hasUpvoted, upvotesCount: t.upvotesCount });
    }
  };

  const post = async () => {
    if (!title.trim() || !body.trim()) return setError('Add a title and your question.');
    try {
      setBusy(true);
      setError('');
      await createDiscussion(slug, { lessonId: lectureId, category, title: title.trim(), body: body.trim() });
      setTitle('');
      setBody('');
      setAsking(false);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Unable to post your question.');
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    try {
      setBusy(true);
      await replyToDiscussion(selected.id, reply.trim());
      setReply('');
      setSelected(await fetchDiscussion(selected.id));
      load();
    } catch (e: any) {
      setError(e?.message || 'Unable to post reply.');
    } finally {
      setBusy(false);
    }
  };

  if (selected) {
    return (
      <View>
        <Link label="‹ Back to discussions" onPress={() => { setSelected(null); setReply(''); }} />
        {selected.loading ? (
          <Empty>Loading discussion…</Empty>
        ) : (
          <View className="mt-4">
            <View className="flex-row items-start justify-between gap-3">
              <Text className="flex-1 text-[20px] font-bold text-white">{selected.title}</Text>
              <Text className={`text-[12px] font-bold ${selected.isResolved ? 'text-success' : 'text-[#F2994A]'}`}>
                {selected.isResolved ? 'Resolved' : 'Open'}
              </Text>
            </View>
            <Text className="mt-1 text-[12px] text-[#6A6F73]">
              {author(selected.author)} · {when(selected.createdAt)}
            </Text>
            <Text className="mt-3 text-[15px] text-[#D1D7DC]">{selected.body}</Text>
            <View className="mt-3 flex-row items-center gap-4">
              <Link label={`${selected.hasUpvoted ? 'Upvoted' : 'Upvote'} ▲ ${selected.upvotesCount || 0}`} onPress={() => vote(selected)} />
              {canModerate ? (
                <Link
                  label={selected.isResolved ? 'Mark open' : 'Mark resolved'}
                  onPress={async () => {
                    await resolveDiscussion(selected.id, !selected.isResolved).catch(() => undefined);
                    patchThread(selected.id, { isResolved: !selected.isResolved });
                  }}
                />
              ) : null}
            </View>
            <Text className="mb-2 mt-6 text-[13px] font-bold uppercase text-[#6A6F73]">Replies</Text>
            {(selected.replies || []).length === 0 ? (
              <Text className="text-[14px] text-[#6A6F73]">No replies yet.</Text>
            ) : (
              (selected.replies || []).map((r: Rec) => (
                <View key={r.id} className={`${BOX} mb-2`}>
                  <Text className="text-[12px] text-[#6A6F73]">
                    {author(r.author)} · {when(r.createdAt)}
                  </Text>
                  <Text className="mt-1 text-[14px] text-white">{r.body}</Text>
                </View>
              ))
            )}
            <TextInput
              value={reply}
              onChangeText={setReply}
              placeholder="Write a reply…"
              placeholderTextColor="#6A6F73"
              multiline
              className={`${INPUT} mb-3 mt-3`}
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
            {error ? <Text className="mb-2 text-danger">{error}</Text> : null}
            <PrimaryButton label={busy ? 'Posting…' : 'Post reply'} onPress={sendReply} disabled={busy || !reply.trim()} />
          </View>
        )}
      </View>
    );
  }

  return (
    <View>
      <PrimaryButton label={asking ? 'Cancel' : 'Ask new question'} onPress={() => { setAsking((a) => !a); setError(''); }} />
      {asking ? (
        <View className={`${BOX} mt-4`}>
          <Chips options={CATS} value={category} onChange={setCategory} />
          <TextInput value={title} onChangeText={setTitle} placeholder="Question title" placeholderTextColor="#6A6F73" className={`${INPUT} mb-3`} />
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Write your question…"
            placeholderTextColor="#6A6F73"
            multiline
            className={`${INPUT} mb-3`}
            style={{ minHeight: 100, textAlignVertical: 'top' }}
          />
          {error ? <Text className="mb-2 text-danger">{error}</Text> : null}
          <PrimaryButton label={busy ? 'Posting…' : 'Post discussion'} onPress={post} disabled={busy} />
        </View>
      ) : (
        <View className="mt-4">
          <Chips options={STATUS} value={status} onChange={setStatus} />
          <Chips options={SORT} value={sort} onChange={setSort} />
        </View>
      )}
      {!asking ? (
        loading ? (
          <Empty>Loading discussions…</Empty>
        ) : threads.length === 0 ? (
          <Empty>No discussions yet. Be the first to start one.</Empty>
        ) : (
          threads.map((t) => (
            <Pressable key={t.id} onPress={() => open(t.id)} className={`${BOX} mb-3 active:opacity-80`}>
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className={`text-[11px] font-bold uppercase ${t.isResolved ? 'text-success' : 'text-[#F2994A]'}`}>
                    {t.isResolved ? 'Resolved' : 'Open'}
                  </Text>
                  <Text className="mt-1 text-[16px] font-bold text-white">{t.title}</Text>
                  <Text className="mt-0.5 text-[12px] text-[#6A6F73]">
                    {author(t.author)} · {when(t.createdAt)}
                  </Text>
                </View>
                <Pressable onPress={() => vote(t)} hitSlop={6} className="items-center rounded-md border border-[#3E4143] px-3 py-1.5">
                  <Text style={{ color: t.hasUpvoted ? LAVENDER : '#D1D7DC' }}>▲</Text>
                  <Text className="text-[12px] font-bold text-white">{t.upvotesCount || 0}</Text>
                </Pressable>
              </View>
              <Text className="mt-2 text-[14px] text-[#D1D7DC]" numberOfLines={2}>
                {t.body}
              </Text>
              <Text className="mt-2 text-[12px] text-[#6A6F73]">{t.repliesCount || 0} replies</Text>
            </Pressable>
          ))
        )
      ) : null}
    </View>
  );
}

/* ---------- Announcements ---------- */

function Comments({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      setItems(await fetchAnnouncementComments(id).catch(() => []));
      setLoading(false);
    }
  };

  const send = async () => {
    if (!draft.trim()) return;
    setBusy(true);
    try {
      const created = await postAnnouncementComment(id, draft.trim());
      if (created) setItems((l) => [...l, created]);
      setDraft('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="mt-3 border-t border-[#2D2F31] pt-3">
      <Link label={open ? 'Hide comments' : 'Comments'} onPress={toggle} />
      {open ? (
        <View className="mt-3">
          {loading ? (
            <Text className="text-[13px] text-[#6A6F73]">Loading comments…</Text>
          ) : items.length === 0 ? (
            <Text className="text-[13px] text-[#6A6F73]">No comments yet.</Text>
          ) : (
            items.map((c) => (
              <View key={c.id} className="mb-2 rounded-md bg-black p-3">
                <Text className="text-[13px] font-bold text-white">
                  {author(c.author)} <Text className="font-normal text-[#6A6F73]">· {fmtDate(c.createdAt)}</Text>
                </Text>
                <Text className="mt-1 text-[14px] text-[#D1D7DC]">{c.body}</Text>
              </View>
            ))
          )}
          <TextInput value={draft} onChangeText={setDraft} placeholder="Write a comment…" placeholderTextColor="#6A6F73" maxLength={2000} className={`${INPUT} my-2`} />
          <OutlineButton label={busy ? 'Posting…' : 'Post'} onPress={send} />
        </View>
      ) : null}
    </View>
  );
}

export function AnnouncementsTab({ courseId }: { courseId: string | number }) {
  const [items, setItems] = useState<Rec[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchAnnouncements(courseId).then(setItems).catch(() => setError(true));
  }, [courseId]);

  if (error) return <Empty>Unable to load announcements.</Empty>;
  if (!items) return <Empty>Loading announcements…</Empty>;
  if (!items.length) return <Empty>No announcements for this course yet.</Empty>;
  return (
    <View>
      {items.map((a) => {
        const sender = a.metadata?.sender;
        return (
          <View key={a.id} className={`${BOX} mb-3`}>
            <View className="flex-row items-start justify-between gap-3">
              <Text className="flex-1 text-[16px] font-bold text-white">{a.title}</Text>
              <Text className="text-[12px] text-[#6A6F73]">{fmtDate(a.createdAt)}</Text>
            </View>
            {sender?.fullName || sender?.username ? (
              <Text className="mt-0.5 text-[12px] text-[#6A6F73]">by {sender.fullName || sender.username}</Text>
            ) : null}
            <Text className="mt-2 text-[14px] text-[#D1D7DC]">{a.message}</Text>
            <Comments id={a.id} />
          </View>
        );
      })}
    </View>
  );
}

/* ---------- Reviews ---------- */

const stars = (n: number) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));

export function ReviewsTab({ courseId }: { courseId: string | number }) {
  const [data, setData] = useState<{ reviews: Rec[]; summary: Rec } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchLearnReviews(courseId).then(setData).catch(() => setError(true));
  }, [courseId]);

  if (error) return <Empty>Unable to load reviews.</Empty>;
  if (!data) return <Empty>Loading reviews…</Empty>;
  const { reviews, summary } = data;
  return (
    <View>
      <View className="mb-4 flex-row items-center gap-3">
        <Text className="text-[34px] font-bold text-white">{Number(summary.averageRating || 0).toFixed(1)}</Text>
        <View>
          <Text style={{ color: '#F2C94C', fontSize: 16 }}>{stars(Number(summary.averageRating || 0))}</Text>
          <Text className="text-[12px] text-[#6A6F73]">{Number(summary.totalReviews || 0)} reviews</Text>
        </View>
      </View>
      {reviews.length === 0 ? (
        <Empty>No reviews yet.</Empty>
      ) : (
        reviews.map((r) => (
          <View key={r.id} className={`${BOX} mb-3`}>
            <View className="flex-row items-center justify-between">
              <Text className="text-[14px] font-bold text-white">{author(r.user || r.author || r.reviewer)}</Text>
              <Text className="text-[12px] text-[#6A6F73]">{fmtDate(r.createdAt || r.created_at)}</Text>
            </View>
            <Text style={{ color: '#F2C94C' }} className="mt-1">
              {stars(Number(r.rating || 0))}
            </Text>
            {r.comment || r.review || r.body ? (
              <Text className="mt-2 text-[14px] text-[#D1D7DC]">{r.comment || r.review || r.body}</Text>
            ) : null}
            {r.authorReply ? (
              <View className="mt-3 border-l-2 border-[#3E4143] pl-3">
                <Text className="text-[12px] font-bold text-[#D1D7DC]">Instructor reply</Text>
                <Text className="mt-1 text-[13px] text-[#D1D7DC]">{r.authorReply}</Text>
              </View>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}
