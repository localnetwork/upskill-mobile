import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import HomeFeed from '@/components/home-feed';
import LearnerHome from '@/components/learner-home';
import { useSessionStore } from '@/store/session';

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="rounded-2xl border border-[#E2E8F0] bg-white p-4 flex-1 min-h-[92px]">
      <Text className="text-[#64748B] text-[12px] uppercase tracking-[1px]">{label}</Text>
      <Text className="mt-2 text-[#0F172A] text-[22px] font-extrabold">{value}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const initialized = useSessionStore((state) => state.initialized);
  const profile = useSessionStore((state) => state.profile);

  if (initialized && !profile) {
    return <HomeFeed />;
  }

  const roles = (profile?.roles || []).map((role) => String(role).toUpperCase());
  const isLearner = roles.includes('LEARNER');
  const isEducator = roles.includes('EDUCATOR');
  const isAdmin = roles.includes('ADMIN');
  const fullName = profile?.fullName || profile?.username || 'Learner';

  if (isLearner && !isEducator && !isAdmin) {
    return <LearnerHome />;
  }

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-4 pt-12 pb-4">
          <Text className="text-[#0F172A] text-[30px] font-extrabold">Hi, {fullName}</Text>
          <Text className="mt-1 text-[#64748B]">Upskill mobile dashboard</Text>
        </View>

        <View className="px-4 flex-row gap-3">
          <StatCard label="Roles" value={roles.join(', ') || 'LEARNER'} />
          <StatCard label="Portal" value={isAdmin ? 'Admin' : isEducator ? 'Instructor' : 'Learner'} />
        </View>

        <View className="px-4 mt-6 gap-3">
          <Pressable
            onPress={() => router.push('/(tabs)/courses')}
            className="rounded-2xl bg-[#0F766E] py-4 px-4">
            <Text className="text-white text-[16px] font-extrabold">Browse Courses</Text>
            <Text className="text-[#CCFBF1] mt-1">Learner catalog, filters, and course details</Text>
          </Pressable>

          {isLearner ? (
            <Pressable
              onPress={() => router.push('/checkout')}
              className="rounded-2xl bg-white border border-[#E2E8F0] py-4 px-4">
              <Text className="text-[#0F172A] text-[16px] font-extrabold">Checkout</Text>
              <Text className="text-[#64748B] mt-1">Review cart and pay for courses</Text>
            </Pressable>
          ) : null}

          {isEducator ? (
            <Pressable
              onPress={() => router.push('/instructor/dashboard')}
              className="rounded-2xl bg-white border border-[#E2E8F0] py-4 px-4">
              <Text className="text-[#0F172A] text-[16px] font-extrabold">Instructor Dashboard</Text>
              <Text className="text-[#64748B] mt-1">Authored courses and payout requests</Text>
            </Pressable>
          ) : null}

          {isAdmin ? (
            <Pressable
              onPress={() => router.push('/admin/dashboard')}
              className="rounded-2xl bg-white border border-[#E2E8F0] py-4 px-4">
              <Text className="text-[#0F172A] text-[16px] font-extrabold">Admin Dashboard</Text>
              <Text className="text-[#64748B] mt-1">Users, course review, and revenue report</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

