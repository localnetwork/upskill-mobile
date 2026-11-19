import { Redirect, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { Api } from '@/lib/api';
import { useSessionStore } from '@/store/session';

type AdminCourse = {
  id: string;
  title: string;
  workflowStatus?: string;
  educator?: { username?: string; fullName?: string };
};

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl border border-[#E2E8F0] bg-white p-4 min-h-[88px]">
      <Text className="text-[#64748B] text-[12px] uppercase">{label}</Text>
      <Text className="mt-2 text-[22px] font-extrabold text-[#0F172A]">{value}</Text>
    </View>
  );
}

export default function AdminDashboardScreen() {
  const initialized = useSessionStore((state) => state.initialized);
  const profile = useSessionStore((state) => state.profile);
  const roles = useMemo(
    () => (profile?.roles || []).map((role) => String(role).toUpperCase()),
    [profile?.roles],
  );
  const isAdmin = roles.includes('ADMIN');

  const [usersCount, setUsersCount] = useState(0);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [revenue, setRevenue] = useState('0.00');
  const [paidOrders, setPaidOrders] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [usersRes, coursesRes, revenueRes] = await Promise.all([
        Api.get<any>('/users?page=1&limit=10'),
        Api.get<any>('/admin/courses?page=1&limit=20'),
        Api.get<any>('/admin/reports/revenue'),
      ]);
      const usersRows = Array.isArray(usersRes?.data) ? usersRes.data : [];
      const courseRows = Array.isArray(coursesRes?.data) ? coursesRes.data : [];
      const totals = revenueRes?.data?.totals || {};
      setUsersCount(usersRows.length);
      setCourses(courseRows);
      setRevenue(Number(totals?.totalAmount || 0).toFixed(2));
      setPaidOrders(Number(revenueRes?.data?.paidOrders || 0));
    } catch (e: any) {
      setError(e?.message || 'Unable to load admin dashboard');
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
  if (initialized && profile && !isAdmin) {
    return <Redirect href="/(tabs)" />;
  }

  const pendingCourses = courses.filter((course) => course.workflowStatus === 'PENDING_APPROVAL');

  return (
    <View className="flex-1 bg-[#F8FAFC] px-4 pt-12">
      <Text className="text-[28px] font-extrabold text-[#0F172A]">Admin Dashboard</Text>
      <Text className="text-[#64748B] mt-1">Users, courses, and revenue</Text>
      {error ? <Text className="text-[#DC2626] mt-3">{error}</Text> : null}
      {loading ? <Text className="text-[#64748B] mt-3">Loading dashboard...</Text> : null}

      <View className="mt-4 flex-row gap-3">
        <SummaryCard label="Users (sample)" value={String(usersCount)} />
        <SummaryCard label="Courses (sample)" value={String(courses.length)} />
      </View>
      <View className="mt-3 flex-row gap-3">
        <SummaryCard label="Paid Orders" value={String(paidOrders)} />
        <SummaryCard label="Revenue" value={`₱${revenue}`} />
      </View>

      <Text className="mt-6 text-[18px] font-extrabold text-[#0F172A]">Pending Course Reviews</Text>
      <FlatList
        data={pendingCourses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 10, paddingTop: 10, paddingBottom: 110 }}
        renderItem={({ item }) => (
          <View className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
            <Text className="font-extrabold text-[#0F172A]">{item.title}</Text>
            <Text className="mt-1 text-[#64748B]">
              Educator:{' '}
              {item.educator?.fullName ||
                item.educator?.username ||
                'N/A'}
            </Text>
            <View className="mt-3 flex-row gap-2">
              <Pressable
                onPress={async () => {
                  try {
                    await Api.post(`/admin/courses/${item.id}/approve`, { note: 'Approved via mobile' });
                    await load();
                  } catch (e: any) {
                    setError(e?.message || 'Unable to approve course');
                  }
                }}
                className="flex-1 rounded-xl bg-[#0F766E] py-2 items-center">
                <Text className="text-white font-bold">Approve</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  try {
                    await Api.post(`/admin/courses/${item.id}/reject`, { note: 'Rejected via mobile review' });
                    await load();
                  } catch (e: any) {
                    setError(e?.message || 'Unable to reject course');
                  }
                }}
                className="flex-1 rounded-xl border border-[#FCA5A5] bg-white py-2 items-center">
                <Text className="text-[#B91C1C] font-bold">Reject</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
            <Text className="text-[#64748B]">No pending course approvals.</Text>
          </View>
        }
      />
    </View>
  );
}

