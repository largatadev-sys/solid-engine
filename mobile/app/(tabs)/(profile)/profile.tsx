import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { ScreenMessage } from '../../../src/components/ScreenMessage';
import { useMe } from '../../../src/hooks/useMe';
import { ONBOARDING_ROUTES } from '../../../src/onboarding/onboardingGate';
import { ProfileDiaryTab } from '../../../src/profile/ProfileDiaryTab';
import { ProfileHeader } from '../../../src/profile/ProfileHeader';
import { ProfileItinerariesTab } from '../../../src/profile/ProfileItinerariesTab';
import { ProfileTabs } from '../../../src/profile/ProfileTabs';
import { PROFILE_LOAD_FAILED } from '../../../src/profile/profileCopy';
import { profileCardOf } from '../../../src/profile/profileCard';
import { selectTab, selectedTab, type ProfileTab } from '../../../src/profile/profileViewState';
import { useProfileStats } from '../../../src/query/profileQueries';
import { colors, spacing } from '../../../src/theme';
import { workspaceColors } from '../../../src/theme/workspaceTokens';


export default function ProfileScreen() {
  const router = useRouter();
  const { state } = useMe();
  const stats = useProfileStats();
  const [tab, setTab] = useState<ProfileTab>(selectedTab);

  if (state.kind === 'loading') {
    return <ActivityIndicator style={styles.loading} color={colors.accent} />;
  }
  if (state.kind === 'error') {
    return <ScreenMessage title={PROFILE_LOAD_FAILED} body={state.error.message} />;
  }

  const chooseTab = (next: ProfileTab) => {
    selectTab(next);
    setTab(next);
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body}>
        <ProfileHeader
          card={profileCardOf(state.me)}
          stats={{
            published: stats.data?.publishedCount ?? null,
            trips: stats.data?.tripCount ?? null,
            failed: stats.isError,
            retry: () => void stats.refetch(),
          }}
          onEditProfile={() => router.push(`${ONBOARDING_ROUTES.profile}?mode=edit`)}
          onOpenAccount={() => router.push('/account')}
        />

        <ProfileTabs selected={tab} onSelect={chooseTab} />

        {tab === 'diary' ? <ProfileDiaryTab /> : <ProfileItinerariesTab />}
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: workspaceColors.surface,
  },
  loading: {
    marginTop: spacing.xl,
  },
  body: {
    paddingBottom: spacing.xl,
  },
});
