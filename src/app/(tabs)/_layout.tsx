import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Redirect, Tabs, usePathname, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSessionStore } from '@/store/session';

type FaName = React.ComponentProps<typeof FontAwesome>['name'];
type TabDef = { label: string; icon: FaName; href: string; path: string };

const FEATURED = { label: 'Featured', icon: 'star', href: '/(tabs)', path: '/' } as const;
const EXPLORE = { label: 'Explore', icon: 'search', href: '/(tabs)/courses', path: '/courses' } as const;
const ACCOUNT = { label: 'Account', icon: 'user-o', href: '/(tabs)/profile', path: '/profile' } as const;

const GUEST_TABS: readonly TabDef[] = [
  FEATURED,
  { label: 'Search', icon: 'search', href: '/(tabs)/courses', path: '/courses' },
  { label: 'My learning', icon: 'play-circle-o', href: '/login', path: '/login' },
  { label: 'Wishlist', icon: 'heart-o', href: '/login', path: '/login' },
  { label: 'Account', icon: 'user-o', href: '/login', path: '/login' },
];

const LEARNER_TABS: readonly TabDef[] = [
  FEATURED,
  EXPLORE,
  { label: 'My learning', icon: 'play-circle-o', href: '/(tabs)/my-learning', path: '/my-learning' },
  ACCOUNT,
];

const EDUCATOR_TABS: readonly TabDef[] = [
  FEATURED,
  EXPLORE,
  { label: 'My dashboard', icon: 'dashboard', href: '/(tabs)/dashboard', path: '/dashboard' },
  ACCOUNT,
];

const ADMIN_TABS: readonly TabDef[] = [
  FEATURED,
  EXPLORE,
  { label: 'Admin', icon: 'shield', href: '/(tabs)/dashboard', path: '/dashboard' },
  ACCOUNT,
];

function DarkTabBar({ tabs }: { tabs: readonly TabDef[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const activeIndex = tabs.findIndex((tab) => tab.path === pathname);

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: '#000',
        borderTopWidth: 1,
        borderTopColor: '#2D2F31',
        paddingTop: 10,
        paddingBottom: Math.max(insets.bottom, 10),
        width: '100%',
        maxWidth: 430,
        alignSelf: 'center',
      }}>
      {tabs.map((tab, index) => {
        const focused = index === activeIndex;
        return (
          <Pressable
            key={tab.label}
            onPress={() => router.navigate(tab.href as never)}
            style={{ flex: 1, alignItems: 'center' }}>
            <FontAwesome
              name={tab.icon}
              size={22}
              color={focused ? '#fff' : '#6A6F73'}
              style={{ marginBottom: 4 }}
            />
            <Text style={{ fontSize: 12, fontWeight: '700', color: focused ? '#fff' : '#6A6F73' }}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const initialized = useSessionStore((state) => state.initialized);
  const profile = useSessionStore((state) => state.profile);
  const guestMode = useSessionStore((state) => state.guestMode);

  const roles = (profile?.roles || []).map((role) => String(role).toUpperCase());

  if (!initialized) return null;
  if (!profile && !guestMode) return <Redirect href="/onboarding" />;

  const tabs = !profile
    ? GUEST_TABS
    : roles.includes('ADMIN')
      ? ADMIN_TABS
      : roles.includes('EDUCATOR')
        ? EDUCATOR_TABS
        : LEARNER_TABS;

  return (
    <Tabs
      tabBar={() => <DarkTabBar tabs={tabs} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: '#000',
          width: '100%',
          maxWidth: 430,
          alignSelf: 'center',
        },
      }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="courses" />
      <Tabs.Screen name="my-learning" />
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
