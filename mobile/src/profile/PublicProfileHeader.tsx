import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { MediaThumb } from '../media/MediaThumb';
import { initialsFor } from '../onboarding/initials';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import { spacing } from '../theme';
import {
  followColors,
  followMetrics,
  followTypography,
  profileColors,
  profileMetrics,
  profileTypography,
  workspaceColors,
  workspaceRadii,
} from '../theme/workspaceTokens';
import { profileMetaLine } from './profileMetaLine';
import { StatCells } from './StatCells';
import {
  DESTINATIONS_STAT_LABEL,
  FOLLOWS_YOU_LABEL,
  FOLLOWING_LABEL,
  FOLLOW_LABEL,
} from './publicProfileCopy';
import {
  FOLLOWERS_STAT_LABEL,
  FOLLOWING_STAT_LABEL,
  PUBLISHED_STAT_LABEL,
} from './profileCopy';


interface PublicProfileHeaderProps {
  readonly displayName: string;
  readonly handle: string | null;
  readonly avatarUrl: string | null;
  readonly bio: string | null;
  readonly vanityNumber: string | null;
  readonly publishedCount: number;
  readonly destinationCount: number;
  readonly followersCount: number;
  readonly followingCount: number;
  readonly following: boolean;
  readonly followsViewer: boolean;
  readonly onFollow: () => void;
  readonly onOpenFollowers: () => void;
  readonly onOpenFollowing: () => void;
}


export function PublicProfileHeader({
  displayName,
  handle,
  avatarUrl,
  bio,
  vanityNumber,
  publishedCount,
  destinationCount,
  followersCount,
  followingCount,
  following,
  followsViewer,
  onFollow,
  onOpenFollowers,
  onOpenFollowing,
}: PublicProfileHeaderProps) {
  const meta = profileMetaLine(handle, vanityNumber);
  const press = usePressFeedback();

  const cells = [
    { label: PUBLISHED_STAT_LABEL, value: publishedCount, open: null },
    { label: DESTINATIONS_STAT_LABEL, value: destinationCount, open: null },
    { label: FOLLOWERS_STAT_LABEL, value: followersCount, open: onOpenFollowers },
    { label: FOLLOWING_STAT_LABEL, value: followingCount, open: onOpenFollowing },
  ];

  return (
    <View style={styles.header}>
      <View style={styles.identity}>
        <MediaThumb
          url={avatarUrl}
          style={styles.avatar}
          fallbackStyle={styles.avatarWell}
          accessibilityLabel={`Profile photo of ${displayName}`}
          fallback={<Text style={styles.initials}>{initialsFor(displayName, null)}</Text>}
        />

        <View style={styles.identityText}>
          <Text style={styles.displayName} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={styles.metaRow}>
            {meta !== null && (
              <Text style={styles.meta} numberOfLines={1}>
                {meta}
              </Text>
            )}
            {followsViewer && (
              <View style={styles.followsYouChip}>
                <Text style={styles.followsYouLabel}>{FOLLOWS_YOU_LABEL}</Text>
              </View>
            )}
          </View>
          {bio !== null && bio.trim() !== '' && (
            <Text style={styles.bio} numberOfLines={2}>
              {bio}
            </Text>
          )}
        </View>
      </View>

      <StatCells cells={cells} />

      <AnimatedPressable
        style={StyleSheet.flatten([
          styles.followPill,
          following && styles.followingPill,
          press.style,
        ])}
        onPress={onFollow}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        accessibilityRole="button"
        accessibilityLabel={`${following ? FOLLOWING_LABEL : FOLLOW_LABEL} ${displayName}`}
      >
        {following && (
          <Icon
            name="check"
            size={followMetrics.checkGlyph}
            color={followColors.followingInk}
          />
        )}
        <Text style={[styles.followLabel, following && styles.followingLabel]}>
          {following ? FOLLOWING_LABEL : FOLLOW_LABEL}
        </Text>
      </AnimatedPressable>
    </View>
  );
}


export function PublicProfileEmptyState({
  title,
  body,
}: {
  readonly title: string;
  readonly body: string;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyCircle}>
        <Icon
          name="postcard"
          size={profileMetrics.emptyGlyph}
          color={workspaceColors.accent}
        />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md2,
    paddingTop: spacing.sm3,
    gap: spacing.md,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: profileMetrics.avatarSize,
    height: profileMetrics.avatarSize,
    borderRadius: profileMetrics.avatarSize / 2,
    flexGrow: 0,
    flexShrink: 0,
  },
  avatarWell: {
    backgroundColor: profileColors.avatarWell,
  },
  initials: {
    ...profileTypography.initials,
    color: profileColors.avatarInk,
  },
  identityText: {
    flex: 1,
    gap: spacing.hair,
  },
  displayName: {
    ...profileTypography.displayName,
    color: workspaceColors.title,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  meta: {
    ...profileTypography.meta,
    color: profileColors.meta,
    flexShrink: 1,
  },
  followsYouChip: {
    backgroundColor: followColors.chipWell,
    borderRadius: workspaceRadii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.hair,
    flexShrink: 0,
  },
  followsYouLabel: {
    ...followTypography.chip,
    color: followColors.chipInk,
  },
  bio: {
    ...profileTypography.bio,
    color: profileColors.bio,
  },
  followPill: {
    height: profileMetrics.editPillHeight,
    borderWidth: 1,
    borderColor: workspaceColors.accent,
    backgroundColor: workspaceColors.accent,
    borderRadius: workspaceRadii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs2,
  },
  followingPill: {
    borderColor: followColors.followingBorder,
    backgroundColor: followColors.followingWell,
  },
  followLabel: {
    ...profileTypography.editPill,
    color: profileColors.onAccent,
  },
  followingLabel: {
    color: followColors.followingInk,
  },
  empty: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm2,
  },
  emptyCircle: {
    width: profileMetrics.emptyCircle,
    height: profileMetrics.emptyCircle,
    borderRadius: profileMetrics.emptyCircle / 2,
    backgroundColor: profileColors.emptyWell,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...profileTypography.emptyTitle,
    color: workspaceColors.title,
  },
  emptyBody: {
    ...profileTypography.emptyBody,
    color: profileColors.meta,
    textAlign: 'center',
    maxWidth: profileMetrics.emptyBodyWidth,
  },
});
