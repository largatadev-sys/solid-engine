import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
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
import { profileKeys, useProfileStats } from '../../../src/query/profileQueries';
import { diaryKeys } from '../../../src/query/diaryQueries';
import { PROFILE_TAB_ROUTE } from '../../../src/navigation/authRoutes';
import { useTabRetap } from '../../../src/navigation/useTabRetap';
import { CAUGHT_UP_TOAST } from '../../../src/navigation/retapCopy';
import { atTop } from '../../../src/feed/headerVisibility';
import { FeedToast } from '../../../src/feed/FeedToast';
import { useRevalidateOnFocus } from '../../../src/query/useRevalidateOnFocus';
import { colors, spacing } from '../../../src/theme';
import { workspaceColors } from '../../../src/theme/workspaceTokens';


export default function ProfileScreen() {
  const router = useRouter();
  const { state } = useMe();
  const client = useQueryClient();
  const stats = useProfileStats();
  const [tab, setTab] = useState<ProfileTab>(selectedTab);

  useRevalidateOnFocus(stats);

  const scroll = useRef<ScrollView | null>(null);
  const offset = useRef(0);
  const [toast, setToast] = useState<string | null>(null);

  useTabRetap(
    PROFILE_TAB_ROUTE,
    useCallback(() => {
      if (atTop(offset.current)) {
        void client.invalidateQueries({ queryKey: profileKeys.all });
        void client.invalidateQueries({ queryKey: diaryKeys.trips() });
        setToast(CAUGHT_UP_TOAST);
        return;
      }
      offset.current = 0;
      scroll.current?.scrollTo({ y: 0, animated: true });
    }, [client]),
  );

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
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.body}
        onScroll={(event) => {
          offset.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={SCROLL_THROTTLE_MS}
      >
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

      <FeedToast message={toast} onDone={() => setToast(null)} />
    </View>
  );
}


const SCROLL_THROTTLE_MS = 100;


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
