import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Redirect, Tabs, usePathname, useRouter } from 'expo-router';
import { Pressable, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useSessionStore } from '@/store/session';

type TabIconProps = {
  focused: boolean;
  label: string;
  icon: string;
  showAlertDot?: boolean;
};

function TabIcon({ focused, label, icon, showAlertDot }: TabIconProps) {
  return (
    <View
      style={{
        minWidth: 96,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 22,
        paddingVertical: focused ? 10 : 6,
        paddingHorizontal: 16,
        backgroundColor: focused ? '#EAF1FF' : 'transparent',
      }}>
      <View style={{ position: 'relative' }}>
        <Text style={{ fontSize: 20, color: focused ? '#0056D2' : '#64748B' }}>{icon}</Text>
        {showAlertDot ? (
          <View
            style={{
              position: 'absolute',
              top: -2,
              right: -4,
              width: 8,
              height: 8,
              borderRadius: 999,
              backgroundColor: '#EF4444',
            }}
          />
        ) : null}
      </View>
      <Text
        style={{
          marginTop: 4,
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.4,
          color: focused ? '#0056D2' : '#475569',
        }}>
        {label}
      </Text>
    </View>
  );
}

type FaName = React.ComponentProps<typeof FontAwesome>['name'];

const GUEST_TABS: readonly { label: string; icon: FaName; href: string }[] = [
  { label: 'Featured', icon: 'star', href: '/(tabs)' },
  { label: 'Search', icon: 'search', href: '/(tabs)/courses' },
  { label: 'My learning', icon: 'play-circle-o', href: '/login' },
  { label: 'Wishlist', icon: 'heart-o', href: '/login' },
  { label: 'Account', icon: 'user-o', href: '/login' },
];

const LEARNER_TABS: readonly { label: string; icon: FaName; href: string }[] = [
  { label: 'Featured', icon: 'star', href: '/(tabs)' },
  { label: 'Discover', icon: 'search', href: '/(tabs)/courses' },
  { label: 'My learning', icon: 'play-circle-o', href: '/(tabs)/my-learning' },
  { label: 'Account', icon: 'user-o', href: '/(tabs)/profile' },
];

function DarkTabBar({ tabs }: { tabs: readonly { label: string; icon: FaName; href: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

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
        const focused =
          tab.href === '/(tabs)'
            ? pathname === '/'
            : pathname === tab.href.replace('/(tabs)', '') && tabs.findIndex((t) => t.href === tab.href) === index;
        return (
          <Pressable
            key={tab.label}
            onPress={() => router.navigate(tab.href as never)}
            style={{ flex: 1, alignItems: 'center' }}>
            <FontAwesome name={tab.icon} size={22} color={focused ? '#fff' : '#6A6F73'} style={{ marginBottom: 4 }} />
            <Text
              style={{ fontSize: 12, fontWeight: '700', color: focused ? '#fff' : '#6A6F73' }}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const initialized = useSessionStore((state) => state.initialized);
  const profile = useSessionStore((state) => state.profile);
  const guestMode = useSessionStore((state) => state.guestMode);

  const roles = (profile?.roles || []).map((role) => String(role).toUpperCase());
  const darkLearner =
    !!profile && roles.includes('LEARNER') && !roles.includes('EDUCATOR') && !roles.includes('ADMIN');

  if (!initialized) return null;
  if (!profile && !guestMode) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      tabBar={
        !profile
          ? () => <DarkTabBar tabs={GUEST_TABS} />
          : darkLearner
            ? () => <DarkTabBar tabs={LEARNER_TABS} />
            : undefined
      }
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        sceneStyle: {
          backgroundColor: '#F8F9FC',
          width: '100%',
          maxWidth: 430,
          alignSelf: 'center',
        },
        tabBarStyle: {
          width: '100%',
          maxWidth: 430,
          alignSelf: 'center',
          height: 88,
          paddingTop: 8,
          paddingBottom: 12,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          overflow: 'hidden',
        },
      }}>
      <Tabs.Screen
        name="courses"
        options={{
          title: 'Courses',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="COURSES" icon="📘" />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="HOME" icon="⌂" />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="ALERTS" icon="🔔" showAlertDot />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="PROFILE" icon="◠" />
          ),
        }}
      />
    </Tabs>
  );
}
