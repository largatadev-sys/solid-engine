import { Tabs, router } from 'expo-router';
import { type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { comingSoon } from '../../src/components/comingSoon';
import { Icon, type IconName } from '../../src/components/Icon';
import { PROFILE_TAB_ROUTE } from '../../src/navigation/authRoutes';
import { colors, typography } from '../../src/theme';


const TAB_ICON_SIZE = 24;

const TAB_BAR_HEIGHT = 64;


function tabIcon(name: IconName) {
  return ({ color }: { color: ColorValue }) => (
    <Icon name={name} size={TAB_ICON_SIZE} color={String(color)} />
  );
}


function bareScene(top: number) {
  return { backgroundColor: colors.background, paddingTop: top };
}


export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: typography.caption,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: tabIcon('home'),
          tabBarAccessibilityLabel: 'Home, coming soon',
        }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            comingSoon('home');
          },
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Discover',
          tabBarIcon: tabIcon('search'),
          tabBarAccessibilityLabel: 'Discover, coming soon',
        }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            comingSoon('search');
          },
        }}
      />
      <Tabs.Screen
        name="(trips)"
        options={{ title: 'Trips', tabBarIcon: tabIcon('briefcase'), sceneStyle: bareScene(insets.top) }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router.canDismiss() ? router.dismissTo('/') : router.navigate('/');
          },
        }}
      />
      <Tabs.Screen
        name="(profile)"
        options={{ title: 'Profile', tabBarIcon: tabIcon('person'), sceneStyle: bareScene(insets.top) }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router.canDismiss()
              ? router.dismissTo(PROFILE_TAB_ROUTE)
              : router.navigate(PROFILE_TAB_ROUTE);
          },
        }}
      />
    </Tabs>
  );
}
