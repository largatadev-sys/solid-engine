import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { ScreenMessage } from '../components/ScreenMessage';
import { FeedToast } from '../feed/FeedToast';
import { useMe } from '../hooks/useMe';
import { useSafeBack } from '../navigation/safeBack';
import { useFollowMutation } from '../query/followQueries';
import { usePublicProfile } from '../query/publicProfileQueries';
import { useRevalidateOnFocus } from '../query/useRevalidateOnFocus';
import { colors, spacing } from '../theme';
import { profileTypography, workspaceColors } from '../theme/workspaceTokens';
import { RowEntrance } from '../members/RowEntrance';
import { publicProfileMotion } from '../theme/workspaceTokens';
import { followStateFrom, reverted, settled, tapped, type FollowState } from './followState';
import { ProfileTabs } from './ProfileTabs';
import { PublicDiaryTab } from './PublicDiaryTab';
import { PublicItinerariesTab } from './PublicItinerariesTab';
import { PublicProfileHeader } from './PublicProfileHeader';
import { trackPublicProfileViewed } from './profileEvents';
import {
  followFailedToast,
  unfollowFailedToast,
  PROFILE_UNAVAILABLE,
  PROFILE_UNAVAILABLE_BODY,
  PUBLIC_PROFILE_BACK_LABEL,
  PUBLIC_PROFILE_TITLE,
} from './publicProfileCopy';
import {
  followersRoute,
  followingRoute,
  ownProfileRoute,
  travelerDestination,
} from './travelerRoutes';
import type { ProfileTab } from './profileViewState';


export function PublicProfileScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
  const insets = useSafeAreaInsets();
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const subject = handle ?? '';

  const { state } = useMe();
  const viewerHandle = state.kind === 'ok' ? state.me.handle : null;
  const destination = travelerDestination(subject, viewerHandle);
  const isSelf = destination.kind === 'own';

  const profile = usePublicProfile(isSelf ? '' : subject);
  const [tab, setTab] = useState<ProfileTab>('diary');
  const [follow, setFollow] = useState<FollowState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const followMutation = useFollowMutation();

  useRevalidateOnFocus(profile, !isSelf);

  useEffect(() => {
    if (isSelf) {
      router.replace(ownProfileRoute());
    }
  }, [isSelf, router]);

  useEffect(() => {
    if (profile.data !== undefined) {
      trackPublicProfileViewed(profile.data.traveler.id, 'publicProfile');
    }
  }, [profile.data, subject]);

  useEffect(() => {
    setFollow(null);
  }, [subject]);

  const served =
    profile.data === undefined
      ? null
      : followStateFrom(profile.data.followedByViewer, profile.data.followersCount);
  const shown = follow ?? served;

  function onFollow() {
    if (profile.data === undefined || shown === null) {
      return;
    }
    const before = shown;
    const next = tapped(before);
    if (next.intent === null) {
      return;
    }
    setFollow(next.state);

    const handle = profile.data.traveler.handle;
    followMutation.mutate(
      { travelerId: profile.data.traveler.id, intent: next.intent },
      {
        onSuccess: () => setFollow(settled(next.state)),
        onError: () => {
          setFollow(reverted(before));
          setToast(
            next.intent === 'follow' ? followFailedToast(handle) : unfollowFailedToast(handle),
          );
        },
      },
    );
  }

  if (isSelf) {
    return <ActivityIndicator style={styles.loading} color={colors.accent} />;
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <Pressable
          style={styles.back}
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={PUBLIC_PROFILE_BACK_LABEL}
        >
          <Icon name="back" size={20} color={workspaceColors.title} />
        </Pressable>
        <Text style={styles.title}>{PUBLIC_PROFILE_TITLE}</Text>
      </View>

      {profile.isPending && <ActivityIndicator style={styles.loading} color={colors.accent} />}

      {profile.isError && (
        <ScreenMessage title={PROFILE_UNAVAILABLE} body={PROFILE_UNAVAILABLE_BODY} />
      )}

      {profile.data !== undefined && (
        <ScrollView contentContainerStyle={styles.body}>
          <PublicProfileHeader
            displayName={profile.data.traveler.displayName ?? subject}
            handle={profile.data.traveler.handle}
            avatarUrl={profile.data.traveler.avatarUrl}
            bio={profile.data.bio}
            vanityNumber={profile.data.vanityNumber}
            publishedCount={profile.data.publishedCount}
            destinationCount={profile.data.destinationCount}
            followersCount={shown?.followersCount ?? profile.data.followersCount}
            followingCount={profile.data.followingCount}
            following={shown?.following ?? profile.data.followedByViewer}
            followsViewer={profile.data.followsViewer}
            onFollow={onFollow}
            onOpenFollowers={() => router.push(followersRoute(subject))}
            onOpenFollowing={() => router.push(followingRoute(subject))}
          />

          <ProfileTabs selected={tab} onSelect={setTab} />

          <RowEntrance
            replayKey={tab}
            durationMs={publicProfileMotion.panelRiseMs}
            risePx={publicProfileMotion.panelRisePx}
          >
          {tab === 'diary' ? (
            <PublicDiaryTab
              handle={subject}
              subjectId={profile.data.traveler.id}
              displayName={profile.data.traveler.displayName ?? subject}
            />
          ) : (
            <PublicItinerariesTab
              handle={subject}
              displayName={profile.data.traveler.displayName ?? subject}
            />
          )}
          </RowEntrance>
        </ScrollView>
      )}

      <FeedToast
        message={toast}
        holdMs={publicProfileMotion.toastHoldMs}
        onDone={() => setToast(null)}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: workspaceColors.surface,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm3,
    paddingTop: spacing.xs2,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...profileTypography.sectionTitle,
    color: workspaceColors.title,
  },
  loading: {
    marginTop: spacing.xl,
  },
  body: {
    paddingBottom: spacing.xl,
  },
});
