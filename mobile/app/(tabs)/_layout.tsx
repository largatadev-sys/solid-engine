import { Tabs, router, usePathname } from 'expo-router';
import { type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../src/components/Icon';
import { DISCOVER_TAB_LABEL } from '../../src/discovery/discoveryCopy';
import { DISCOVER_TAB_ROUTE } from '../../src/discovery/discoveryRoutes';
import {
  HOME_TAB_ROUTE,
  PROFILE_TAB_ROUTE,
  TRIPS_TAB_ROUTE,
} from '../../src/navigation/authRoutes';
import { homeTabRetapped } from '../../src/feed/homeTabRetap';
import {
  inDiscoverStack,
  inHomeStack,
  inProfileStack,
  inTripsStack,
  tabJump,
} from '../../src/navigation/tabJump';
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
  const pathname = usePathname();

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
        name="(home)"
        options={{ title: 'Home', tabBarIcon: tabIcon('home'), sceneStyle: bareScene(0) }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            if (inHomeStack(pathname)) {
              homeTabRetapped();
              return;
            }
            router[tabJump(router.canDismiss(), false)](HOME_TAB_ROUTE);
          },
        }}
      />
      <Tabs.Screen
        name="(discover)"
        options={{
          title: DISCOVER_TAB_LABEL,
          tabBarIcon: tabIcon('search'),
        }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router[tabJump(router.canDismiss(), inDiscoverStack(pathname))](DISCOVER_TAB_ROUTE);
          },
        }}
      />
      <Tabs.Screen
        name="(trips)"
        options={{ title: 'Trips', tabBarIcon: tabIcon('briefcase'), sceneStyle: bareScene(insets.top) }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router[tabJump(router.canDismiss(), inTripsStack(pathname))](TRIPS_TAB_ROUTE);
          },
        }}
      />
      <Tabs.Screen
        name="(profile)"
        options={{ title: 'Profile', tabBarIcon: tabIcon('person'), sceneStyle: bareScene(insets.top) }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router[tabJump(router.canDismiss(), inProfileStack(pathname))](PROFILE_TAB_ROUTE);
          },
        }}
      />
    </Tabs>
  );
}
