import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SubTabs } from '@/components/dark-ui';
import InstructorCommunication from '@/components/instructor/communication';
import InstructorCourses from '@/components/instructor/courses';
import InstructorPerformance from '@/components/instructor/performance';
import InstructorSettings from '@/components/instructor/settings';
import { useSessionStore } from '@/store/session';

import AdminDashboardScreen from '../admin/dashboard';

const SECTIONS = [
  { key: 'courses', label: 'Courses' },
  { key: 'communication', label: 'Communication' },
  { key: 'performance', label: 'Performance' },
  { key: 'settings', label: 'Settings' },
] as const;

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const initialized = useSessionStore((state) => state.initialized);
  const profile = useSessionStore((state) => state.profile);
  const [section, setSection] = useState<(typeof SECTIONS)[number]['key']>('courses');

  if (initialized && !profile) return <Redirect href="/login" />;

  const roles = (profile?.roles || []).map((role) => String(role).toUpperCase());
  if (roles.includes('ADMIN')) return <AdminDashboardScreen />;
  if (initialized && !roles.includes('EDUCATOR')) return <Redirect href="/(tabs)" />;

  return (
    <View className="flex-1 bg-black" style={{ paddingTop: insets.top + 16 }}>
      <Text className="mb-3 px-4 text-[28px] font-bold text-white">Instructor</Text>
      <SubTabs tabs={SECTIONS} value={section} onChange={setSection} />
      <ScrollView
        key={section}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 }}>
        {section === 'courses' ? <InstructorCourses /> : null}
        {section === 'communication' ? <InstructorCommunication /> : null}
        {section === 'performance' ? <InstructorPerformance /> : null}
        {section === 'settings' ? <InstructorSettings /> : null}
      </ScrollView>
    </View>
  );
}
