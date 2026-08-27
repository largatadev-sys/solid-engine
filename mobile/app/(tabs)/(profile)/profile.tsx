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
import { followersRoute, followingRoute } from '../../../src/profile/travelerRoutes';
import { profileKeys, useProfileStats } from '../../../src/query/profileQueries';
import { diaryKeys } from '../../../src/query/diaryQueries';
import { PROFILE_TAB_ROUTE } from '../../../src/navigation/authRoutes';
import { useTabRetap } from '../../../src/navigation/useTabRetap';
import { CAUGHT_UP_TOAST } from '../../../src/feed/feedCopy';
import { atTop } from '../../../src/feed/headerVisibility';
import { RETAP_SCROLL_THROTTLE_MS } from '../../../src/navigation/retapScroll';
import { SCROLL_TO_TOP_ANIMATED } from '../../../src/navigation/scrollToTop';
import { FeedToast } from '../../../src/feed/FeedToast';
import { RemovalSheet } from '../../../src/removal/RemovalSheet';
import { UndoToast } from '../../../src/removal/UndoToast';
import { useProfileRemoval } from '../../../src/removal/useProfileRemoval';
import { useRevalidateOnFocus } from '../../../src/query/useRevalidateOnFocus';
import { colors, spacing } from '../../../src/theme';
import { workspaceColors } from '../../../src/theme/workspaceTokens';


export default function ProfileScreen() {
  const router = useRouter();
  const { state } = useMe();
  const client = useQueryClient();
  const stats = useProfileStats();
  const [tab, setTab] = useState<ProfileTab>(selectedTab);
  const myHandle = state.kind === 'ok' ? state.me.handle : null;

  useRevalidateOnFocus(stats);

  const scroll = useRef<ScrollView | null>(null);
  const offset = useRef(0);
  const [toast, setToast] = useState<string | null>(null);
  const { removal, choose } = useProfileRemoval();

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
      scroll.current?.scrollTo({ y: 0, animated: SCROLL_TO_TOP_ANIMATED });
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
        scrollEventThrottle={RETAP_SCROLL_THROTTLE_MS}
      >
        <ProfileHeader
          card={profileCardOf(state.me)}
          stats={{
            published: stats.data?.publishedCount ?? null,
            destinations: stats.data?.destinationCount ?? null,
            followers: stats.data?.followersCount ?? null,
            following: stats.data?.followingCount ?? null,
            failed: stats.isError,
            retry: () => void stats.refetch(),
            openFollowers: () => {
              if (myHandle !== null) router.push(followersRoute(myHandle));
            },
            openFollowing: () => {
              if (myHandle !== null) router.push(followingRoute(myHandle));
            },
          }}
          onEditProfile={() => router.push(`${ONBOARDING_ROUTES.profile}?mode=edit`)}
          onOpenAccount={() => router.push('/account')}
        />

        <ProfileTabs selected={tab} onSelect={chooseTab} />

        {tab === 'diary' ? (
          <ProfileDiaryTab removal={removal} />
        ) : (
          <ProfileItinerariesTab removal={removal} />
        )}
      </ScrollView>

      <RemovalSheet
        subject={removal.subject}
        lastSubject={removal.lastSubject}
        onSelect={choose}
        onDismiss={removal.closeMenu}
      />

      <FeedToast message={toast} onDone={() => setToast(null)} />

      <UndoToast
        toast={removal.queue.toast}
        host="profile"
        onUndo={removal.undo}
        onDone={removal.settle}
      />
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
