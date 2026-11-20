import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import {
  BarList,
  Chips,
  Columns,
  Empty,
  num,
  php,
  SectionTitle,
  StatGrid,
  SubTabs,
} from '@/components/dark-ui';
import {
  fetchAuthoredCoursesFull,
  fetchCourseStatistics,
  fetchPayoutSummary,
} from '@/lib/upskill-api';

const SECTIONS = [
  { key: 'overview', label: 'Overview' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'students', label: 'Students' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'engagement', label: 'Course engagement' },
  { key: 'coding', label: 'Coding exercise insights' },
  { key: 'practice', label: 'Practice tests insights' },
  { key: 'quality', label: 'Content quality' },
  { key: 'traffic', label: 'Traffic & conversion' },
] as const;
type Section = (typeof SECTIONS)[number]['key'];

const RANGES = [
  { key: '3', label: 'Last 3 months' },
  { key: '6', label: 'Last 6 months' },
  { key: '12', label: 'Last 12 months' },
] as const;

const arr = (v: any): any[] => (Array.isArray(v) ? v : []);
const short = (t: string, max = 30) => (t.length > max ? `${t.slice(0, max - 1)}…` : t);
const lessonsOf = (course: any) => arr(course?.sections).flatMap((s) => arr(s?.lessons));
const lessonType = (l: any) => String(l?.type || '').toUpperCase();

export default function InstructorPerformance() {
  const [section, setSection] = useState<Section>('overview');
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('3');
  const [courses, setCourses] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const authored = await fetchAuthoredCoursesFull();
        const rows = await Promise.all(
          authored.slice(0, 25).map(async (course) => {
            try {
              const data = await fetchCourseStatistics(course.slug);
              return { courseId: course.id, title: course.title, ...data };
            } catch {
              return null;
            }
          }),
        );
        const payout = await fetchPayoutSummary().catch(() => null);
        if (cancelled) return;
        setCourses(authored);
        setStats(rows.filter(Boolean));
        setSummary(payout);
      } catch {
        // empty states render below
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const overview = useMemo(() => {
    const sum = (pick: (r: any) => unknown) => stats.reduce((t, r) => t + num(pick(r)), 0);
    const reviews = sum((r) => r?.overview?.total_reviews);
    const weighted = sum((r) => num(r?.overview?.average_rating) * num(r?.overview?.total_reviews));
    return {
      students: sum((r) => r?.overview?.total_students),
      revenue: sum((r) => r?.overview?.total_revenue),
      impressions: sum((r) => r?.overview?.total_impressions),
      visitors: sum((r) => r?.overview?.unique_impression_visitors),
      reviews,
      rating: reviews ? weighted / reviews : 0,
    };
  }, [stats]);

  const monthlyRevenue = useMemo(() => {
    const months = Number(range);
    const now = new Date();
    const buckets = new Map<string, { label: string; value: number }>();
    for (let i = months - 1; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.set(`${d.getFullYear()}-${d.getMonth()}`, {
        label: d.toLocaleDateString('en-PH', { month: 'short' }),
        value: 0,
      });
    }
    stats.forEach((row) =>
      arr(row?.trends?.daily_revenue).forEach((e) => {
        const d = new Date(e.date);
        const bucket = buckets.get(`${d.getFullYear()}-${d.getMonth()}`);
        if (bucket) bucket.value += num(e.revenue);
      }),
    );
    return Array.from(buckets.values());
  }, [stats, range]);

  const byCourse = (pick: (r: any) => number) =>
    stats
      .map((r) => ({ label: short(r.title || 'Course'), value: pick(r) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

  const distribution = useMemo(() => {
    const counts = new Map<number, number>([[5, 0], [4, 0], [3, 0], [2, 0], [1, 0]]);
    stats.forEach((row) =>
      arr(row?.distribution?.rating_distribution).forEach((b) => {
        const key = Number(b?.rating);
        if (counts.has(key)) counts.set(key, (counts.get(key) || 0) + num(b?.count));
      }),
    );
    return Array.from(counts.entries()).map(([rating, value]) => ({ label: `${rating} ★`, value }));
  }, [stats]);

  const coding = courses
    .map((c) => ({ label: short(c.title || 'Course'), value: lessonsOf(c).filter((l) => lessonType(l) === 'CODING_EXERCISE').length }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const practice = courses
    .map((c) => ({ label: short(c.title || 'Course'), value: lessonsOf(c).filter((l) => lessonType(l) === 'QUIZ').length }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const quality = courses
    .map((c) => {
      const checks: [string, boolean][] = [
        ['Subtitle', !!String(c?.subtitle || '').trim()],
        ['Description', !!String(c?.description || '').trim()],
        ['Promo video', !!c?.promo_video?.path],
        ['Learning goals', arr(c?.goals?.what_you_will_learn_data).length > 0],
        ['Sections', num(c?.resources_count?.section_count) > 0],
      ];
      return {
        title: c.title || 'Course',
        score: checks.filter(([, ok]) => ok).length,
        missing: checks.filter(([, ok]) => !ok).map(([label]) => label),
      };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 12);

  const conversion = stats
    .map((r) => {
      const impressions = num(r?.overview?.total_impressions);
      const students = num(r?.overview?.total_students);
      return {
        label: short(r.title || 'Course'),
        impressions,
        students,
        rate: impressions > 0 ? (students / impressions) * 100 : 0,
      };
    })
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);

  const n = (v: number) => v.toLocaleString('en-PH');

  return (
    <View>
      <View className="-mx-4 mb-4">
        <SubTabs tabs={SECTIONS} value={section} onChange={setSection} />
      </View>
      {loading ? <Text className="text-[#D1D7DC]">Loading analytics...</Text> : null}

      {!loading && section === 'overview' ? (
        <StatGrid
          items={[
            { label: 'Total revenue', value: php(overview.revenue) },
            { label: 'Total students', value: n(overview.students) },
            { label: 'Avg. rating', value: overview.rating.toFixed(2), hint: `${n(overview.reviews)} reviews` },
            { label: 'Impressions', value: n(overview.impressions), hint: `${n(overview.visitors)} unique visitors` },
            { label: 'Available payout', value: php(summary?.availableBalance) },
            { label: 'Recent income', value: php(summary?.thisMonthEarnings) },
          ]}
        />
      ) : null}

      {!loading && section === 'revenue' ? (
        <>
          <Chips options={RANGES} value={range} onChange={setRange} />
          <StatGrid
            items={[
              { label: 'In range', value: php(monthlyRevenue.reduce((t, m) => t + m.value, 0)) },
              { label: 'All time', value: php(overview.revenue) },
            ]}
          />
          <SectionTitle>Revenue by month</SectionTitle>
          <Columns data={monthlyRevenue} format={(v) => php(v, 0)} />
        </>
      ) : null}

      {!loading && section === 'students' ? (
        <>
          <StatGrid
            items={[
              { label: 'Total students', value: n(overview.students) },
              {
                label: 'New this month',
                value: n(stats.reduce((t, r) => t + num(r?.overview?.enrollments_this_month), 0)),
              },
            ]}
          />
          <SectionTitle>Students per course</SectionTitle>
          <BarList rows={byCourse((r) => num(r?.overview?.total_students))} />
        </>
      ) : null}

      {!loading && section === 'reviews' ? (
        <>
          <StatGrid
            items={[
              { label: 'Avg. rating', value: overview.rating.toFixed(2) },
              { label: 'Total reviews', value: n(overview.reviews) },
            ]}
          />
          <SectionTitle>Rating distribution</SectionTitle>
          <BarList rows={distribution} />
        </>
      ) : null}

      {!loading && section === 'engagement' ? (
        <>
          <StatGrid
            items={[
              { label: 'Impressions', value: n(overview.impressions) },
              { label: 'Unique visitors', value: n(overview.visitors) },
            ]}
          />
          <SectionTitle>Impressions per course</SectionTitle>
          <BarList rows={byCourse((r) => num(r?.overview?.total_impressions))} />
        </>
      ) : null}

      {!loading && section === 'coding' ? (
        <>
          <SectionTitle>Coding exercises per course</SectionTitle>
          {coding.length ? <BarList rows={coding} /> : <Empty>No coding exercises yet.</Empty>}
        </>
      ) : null}

      {!loading && section === 'practice' ? (
        <>
          <SectionTitle>Practice tests per course</SectionTitle>
          {practice.length ? <BarList rows={practice} /> : <Empty>No practice tests yet.</Empty>}
        </>
      ) : null}

      {!loading && section === 'quality' ? (
        <>
          <SectionTitle>Content quality score</SectionTitle>
          {quality.length ? (
            quality.map((q, i) => (
              <View key={`${q.title}-${i}`} className="mb-5">
                <View className="flex-row justify-between">
                  <Text numberOfLines={1} className="mr-3 flex-1 text-[16px] text-white">
                    {q.title}
                  </Text>
                  <Text className="text-[16px] font-bold text-white">{q.score}/5</Text>
                </View>
                <Text className="mt-1 text-[13px] text-[#D1D7DC]">
                  {q.missing.length ? `Missing: ${q.missing.join(', ')}` : 'Complete'}
                </Text>
              </View>
            ))
          ) : (
            <Empty>No courses yet.</Empty>
          )}
        </>
      ) : null}

      {!loading && section === 'traffic' ? (
        <>
          <SectionTitle>Conversion by course</SectionTitle>
          {conversion.length ? (
            conversion.map((c, i) => (
              <View key={`${c.label}-${i}`} className="mb-5 border-b border-[#2D2F31] pb-4">
                <Text numberOfLines={1} className="text-[16px] font-bold text-white">
                  {c.label}
                </Text>
                <Text className="mt-1 text-[14px] text-[#D1D7DC]">
                  {n(c.impressions)} impressions · {n(c.students)} students · {c.rate.toFixed(2)}% conversion
                </Text>
              </View>
            ))
          ) : (
            <Empty>No data yet.</Empty>
          )}
        </>
      ) : null}
    </View>
  );
}
