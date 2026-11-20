import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Redirect, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSessionStore } from '@/store/session';

type FaName = React.ComponentProps<typeof FontAwesome>['name'];

function Row({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: FaName;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-4 py-[18px] active:opacity-60">
      <View className="w-9 items-center">
        <FontAwesome name={icon} size={20} color={danger ? '#F87171' : '#fff'} />
      </View>
      <Text className={`ml-3 flex-1 text-[18px] ${danger ? 'text-[#F87171]' : 'text-white'}`}>
        {label}
      </Text>
      {danger ? null : <FontAwesome name="angle-right" size={26} color="#C0C4FC" />}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useSessionStore((state) => state.profile);
  const logout = useSessionStore((state) => state.logout);

  if (!profile) return <Redirect href="/login" />;

  const roles = (profile.roles || []).map((role) => String(role).toUpperCase());
  const isLearnerOnly = !roles.includes('EDUCATOR') && !roles.includes('ADMIN');
  const name = profile.fullName || profile.username || 'Upskill learner';
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const onLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <View className="flex-1 bg-black" style={{ paddingTop: insets.top + 16 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <Text className="px-4 text-[28px] font-bold text-white">Account</Text>

        <View className="mx-4 mt-6 flex-row items-center">
          <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-[#A435F0]">
            <Text className="text-[26px] font-bold text-white">{initials || '?'}</Text>
          </View>
          <View className="ml-4 flex-1">
            <Text numberOfLines={1} className="text-[22px] font-bold text-white">
              {name}
            </Text>
            {profile.email ? (
              <Text numberOfLines={1} className="mt-1 text-[15px] text-[#D1D7DC]">
                {profile.email}
              </Text>
            ) : null}
          </View>
        </View>

        <View className="mt-8 border-t border-[#2D2F31]" />
        <Row
          icon="play-circle-o"
          label="My learning"
          onPress={() => router.navigate('/(tabs)/my-learning' as never)}
        />
        {isLearnerOnly ? null : (
          <Row icon="search" label="Discover courses" onPress={() => router.navigate('/(tabs)/courses' as never)} />
        )}
        {roles.includes('EDUCATOR') ? (
          <Row icon="graduation-cap" label="Instructor dashboard" onPress={() => router.push('/instructor/dashboard')} />
        ) : null}
        {roles.includes('ADMIN') ? (
          <Row icon="shield" label="Admin dashboard" onPress={() => router.push('/admin/dashboard')} />
        ) : null}
        <View className="border-t border-[#2D2F31]" />
        <Row icon="sign-out" label="Log out" danger onPress={onLogout} />
      </ScrollView>
    </View>
  );
}
