import { Tabs, useRouter } from 'expo-router';
import { comingSoon } from '../../src/components/comingSoon';
import { colors, typography } from '../../src/theme';


export default function TabsLayout() {
  const router = useRouter();

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerTitleStyle: typography.bodyStrong,
        headerStyle: { backgroundColor: colors.background },
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: typography.caption,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: 'Home', tabBarAccessibilityLabel: 'Home, coming soon' }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            comingSoon('home');
          },
        }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: 'Search', tabBarAccessibilityLabel: 'Search, coming soon' }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            comingSoon('search');
          },
        }}
      />
      <Tabs.Screen
        name="create"
        options={{ title: '+', tabBarAccessibilityLabel: 'Plan a trip' }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router.push('/itineraries/new');
          },
        }}
      />
      <Tabs.Screen name="index" options={{ title: 'Trips', headerShown: false }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', headerShown: false }} />
    </Tabs>
  );
}
