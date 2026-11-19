import { Redirect, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';

import { fetchAuthoredCourses, fetchMyPayouts, type CourseSummary } from '@/lib/upskill-api';
import { useSessionStore } from '@/store/session';

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl border border-[#E2E8F0] bg-white p-4 min-h-[88px]">
      <Text className="text-[#64748B] text-[12px] uppercase">{label}</Text>
      <Text className="mt-2 text-[22px] font-extrabold text-[#0F172A]">{value}</Text>
    </View>
  );
}

export default function InstructorDashboardScreen() {
  const initialized = useSessionStore((state) => state.initialized);
  const profile = useSessionStore((state) => state.profile);
  const roles = useMemo(
    () => (profile?.roles || []).map((role) => String(role).toUpperCase()),
    [profile?.roles],
  );
  const isEducator = roles.includes('EDUCATOR');

  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [authored, myPayouts] = await Promise.all([fetchAuthoredCourses({}), fetchMyPayouts()]);
      setCourses(authored.rows);
      setPayouts(myPayouts.rows || []);
    } catch (e: any) {
      setError(e?.message || 'Unable to load instructor dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (initialized && !profile) {
    return <Redirect href="/login" />;
  }
  if (initialized && profile && !isEducator) {
    return <Redirect href="/(tabs)" />;
  }

  const publishedCourses = courses.filter((course) => course.workflowStatus === 'PUBLISHED').length;
  const pendingCourses = courses.filter((course) => course.workflowStatus === 'PENDING_APPROVAL').length;
  const requestedPayouts = payouts.filter((payout) => payout.status === 'REQUESTED').length;
  const totalRequestedAmount = payouts
    .reduce((sum, payout) => sum + Number(payout?.amount || 0), 0)
    .toFixed(2);

  return (
    <View className="flex-1 bg-[#F8FAFC] px-4 pt-12">
      <Text className="text-[28px] font-extrabold text-[#0F172A]">Instructor Dashboard</Text>
      <Text className="text-[#64748B] mt-1">Courses and payout requests</Text>
      {error ? <Text className="text-[#DC2626] mt-3">{error}</Text> : null}
      {loading ? <Text className="text-[#64748B] mt-3">Loading dashboard...</Text> : null}

      <View className="mt-4 flex-row gap-3">
        <SummaryCard label="Courses" value={String(courses.length)} />
        <SummaryCard label="Published" value={String(publishedCourses)} />
      </View>
      <View className="mt-3 flex-row gap-3">
        <SummaryCard label="Pending Review" value={String(pendingCourses)} />
        <SummaryCard label="Requested Payouts" value={String(requestedPayouts)} />
      </View>
      <View className="mt-3">
        <SummaryCard label="Total Requested" value={`₱${totalRequestedAmount}`} />
      </View>

      <Text className="mt-6 text-[18px] font-extrabold text-[#0F172A]">Authored Courses</Text>
      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 10, paddingTop: 10, paddingBottom: 110 }}
        renderItem={({ item }) => (
          <View className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
            <Text className="font-extrabold text-[#0F172A]">{item.title}</Text>
            <Text className="mt-1 text-[#64748B]">Status: {item.workflowStatus || 'DRAFT'}</Text>
            <Text className="mt-1 text-[#64748B]">
              Level: {item.instructional_level?.title || 'All Levels'}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

