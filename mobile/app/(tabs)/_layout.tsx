import { Tabs, useRouter } from 'expo-router';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { comingSoon } from '../../src/components/comingSoon';
import { Icon, type IconName } from '../../src/components/Icon';
import { colors, radii, typography } from '../../src/theme';


const TAB_ICON_SIZE = 24;

const CREATE_BUTTON_SIZE = 40;

const CREATE_ICON_SIZE = 22;


function tabIcon(name: IconName) {
  return ({ color }: { color: ColorValue }) => (
    <Icon name={name} size={TAB_ICON_SIZE} color={String(color)} />
  );
}


function createButton() {
  return (
    <View style={styles.createButton}>
      <Icon name="plus" size={CREATE_ICON_SIZE} color={colors.textOnAccent} />
    </View>
  );
}


export default function TabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background, paddingTop: insets.top },
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
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
          title: 'Search',
          tabBarIcon: tabIcon('search'),
          tabBarAccessibilityLabel: 'Search, coming soon',
        }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            comingSoon('search');
          },
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          tabBarIcon: createButton,
          tabBarLabel: () => null,
          tabBarAccessibilityLabel: 'Plan a trip',
        }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router.push('/itineraries/new');
          },
        }}
      />
      <Tabs.Screen name="index" options={{ title: 'Trips', tabBarIcon: tabIcon('map') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon('person') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  createButton: {
    width: CREATE_BUTTON_SIZE,
    height: CREATE_BUTTON_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
