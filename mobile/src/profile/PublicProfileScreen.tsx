import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { ScreenMessage } from '../components/ScreenMessage';
import { FeedToast } from '../feed/FeedToast';
import { useMe } from '../hooks/useMe';
import { useSafeBack } from '../navigation/safeBack';
import { usePublicProfile } from '../query/publicProfileQueries';
import { useRevalidateOnFocus } from '../query/useRevalidateOnFocus';
import { colors, spacing } from '../theme';
import { profileTypography, workspaceColors } from '../theme/workspaceTokens';
import { RowEntrance } from '../members/RowEntrance';
import { publicProfileMotion } from '../theme/workspaceTokens';
import { useFollowPill } from './useFollowPill';
import { LockedProfileNotice } from './LockedProfileNotice';
import { profileProjection } from './lockedProfile';
import { ProfileTabs } from './ProfileTabs';
import { PublicDiaryTab } from './PublicDiaryTab';
import { PublicItinerariesTab } from './PublicItinerariesTab';
import { PublicProfileHeader } from './PublicProfileHeader';
import { trackPublicProfileViewed } from './profileEvents';
import {
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
  const { shown, onPress: onFollow, toast, clearToast } = useFollowPill(profile.data, subject);

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

  const projection = profileProjection(
    profile.data?.visibility ?? 'public',
    shown?.relation ?? profile.data?.viewerRelation ?? 'none',
  );

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
            relation={shown?.relation ?? profile.data.viewerRelation}
            onFollow={onFollow}
            onOpenFollowers={
              projection.cellsOpen ? () => router.push(followersRoute(subject)) : null
            }
            onOpenFollowing={
              projection.cellsOpen ? () => router.push(followingRoute(subject)) : null
            }
          />

          {projection.showsNotice ? (
            <LockedProfileNotice displayName={profile.data.traveler.displayName} />
          ) : (
            <>
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
            </>
          )}
        </ScrollView>
      )}

      <FeedToast
        message={toast}
        holdMs={publicProfileMotion.toastHoldMs}
        onDone={clearToast}
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
