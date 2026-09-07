import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { DIARIES_STAT_LABEL, ITINERARIES_STAT_LABEL } from '../diary/memoryCopy';
import { MediaThumb } from '../media/MediaThumb';
import { initialsFor } from '../onboarding/initials';
import { spacing } from '../theme';
import { memoryColors, memoryMetrics, memoryTypography } from '../theme/memoryTokens';
import {
  profileColors,
  profileMetrics,
  profileTypography,
  workspaceColors,
} from '../theme/workspaceTokens';
import { FollowPill } from './FollowPill';
import { profileMetaLine } from './profileMetaLine';
import { StatCells } from './StatCells';
import type { ViewerRelation } from '../types/api';
import { FOLLOWERS_STAT_LABEL, FOLLOWING_STAT_LABEL } from './profileCopy';


interface PublicProfileHeaderProps {
  readonly displayName: string;
  readonly handle: string | null;
  readonly avatarUrl: string | null;
  readonly bio: string | null;
  readonly vanityNumber: string | null;
  readonly diaryCount: number | null;
  readonly itineraryCount: number;
  readonly followersCount: number;
  readonly followingCount: number;
  readonly relation: ViewerRelation;
  readonly onFollow: () => void;
  readonly onOpenFollowers: (() => void) | null;
  readonly onOpenFollowing: (() => void) | null;
}


export function PublicProfileHeader({
  displayName,
  handle,
  avatarUrl,
  bio,
  vanityNumber,
  diaryCount,
  itineraryCount,
  followersCount,
  followingCount,
  relation,
  onFollow,
  onOpenFollowers,
  onOpenFollowing,
}: PublicProfileHeaderProps) {
  const meta = profileMetaLine(handle, vanityNumber);

  const cells = [
    { label: DIARIES_STAT_LABEL, value: diaryCount, open: null },
    { label: ITINERARIES_STAT_LABEL, value: itineraryCount, open: null },
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
          {meta !== null && (
            <Text style={styles.handle} numberOfLines={1}>
              {meta}
            </Text>
          )}
          {bio !== null && bio.trim() !== '' && (
            <Text style={styles.bio} numberOfLines={2}>
              {bio}
            </Text>
          )}
        </View>
      </View>

      <StatCells cells={cells} />

      <FollowPill relation={relation} displayName={displayName} onPress={onFollow} />
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
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: memoryMetrics.avatar,
    height: memoryMetrics.avatar,
    borderRadius: memoryMetrics.avatar / 2,
    flexGrow: 0,
    flexShrink: 0,
  },
  avatarWell: {
    backgroundColor: memoryColors.accentWash,
  },
  initials: {
    ...profileTypography.initials,
    color: memoryColors.accentDeep,
  },
  identityText: {
    flex: 1,
    gap: spacing.hair,
  },
  displayName: {
    ...memoryTypography.displayName,
    color: memoryColors.title,
  },
  handle: {
    ...memoryTypography.handle,
    color: memoryColors.muted,
  },
  bio: {
    ...memoryTypography.bio,
    color: memoryColors.bio,
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
