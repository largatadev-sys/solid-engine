import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { MediaThumb } from '../media/MediaThumb';
import { initialsFor } from '../onboarding/initials';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import { spacing } from '../theme';
import {
  profileColors,
  profileMetrics,
  profileTypography,
  workspaceColors,
  workspaceRadii,
} from '../theme/workspaceTokens';
import { profileMetaLine } from './profileMetaLine';
import { FOLLOW_LABEL, POSTCARDS_STAT_LABEL } from './publicProfileCopy';
import { PUBLISHED_STAT_LABEL } from './profileCopy';


interface PublicProfileHeaderProps {
  readonly displayName: string;
  readonly handle: string | null;
  readonly avatarUrl: string | null;
  readonly bio: string | null;
  readonly vanityNumber: string | null;
  readonly publishedCount: number;
  readonly postcardCount: number;
  readonly onFollow: () => void;
}


export function PublicProfileHeader({
  displayName,
  handle,
  avatarUrl,
  bio,
  vanityNumber,
  publishedCount,
  postcardCount,
  onFollow,
}: PublicProfileHeaderProps) {
  const meta = profileMetaLine(handle, vanityNumber);
  const press = usePressFeedback();

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
            <Text style={styles.meta} numberOfLines={1}>
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

      <View style={styles.stats}>
        {[
          { label: PUBLISHED_STAT_LABEL, value: publishedCount },
          { label: POSTCARDS_STAT_LABEL, value: postcardCount },
        ].map((cell, index) => (
          <View key={cell.label} style={[styles.cell, index > 0 && styles.divided]}>
            <Text style={styles.statValue}>{cell.value}</Text>
            <Text style={styles.statLabel}>{cell.label}</Text>
          </View>
        ))}
      </View>

      <AnimatedPressable
        style={StyleSheet.flatten([styles.followPill, press.style])}
        onPress={onFollow}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        accessibilityRole="button"
        accessibilityLabel={`${FOLLOW_LABEL} ${displayName}`}
      >
        <Text style={styles.followLabel}>{FOLLOW_LABEL}</Text>
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
  meta: {
    ...profileTypography.meta,
    color: profileColors.meta,
  },
  bio: {
    ...profileTypography.bio,
    color: profileColors.bio,
  },
  stats: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    borderRadius: profileMetrics.statsRadius,
    paddingVertical: spacing.sm2,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.hair,
  },
  divided: {
    borderLeftWidth: 1,
    borderLeftColor: profileColors.cellDivider,
  },
  statValue: {
    ...profileTypography.statValue,
    color: workspaceColors.title,
  },
  statLabel: {
    ...profileTypography.statLabel,
    color: profileColors.meta,
  },
  followPill: {
    height: profileMetrics.editPillHeight,
    borderWidth: 1,
    borderColor: workspaceColors.accent,
    backgroundColor: workspaceColors.accent,
    borderRadius: workspaceRadii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followLabel: {
    ...profileTypography.editPill,
    color: profileColors.onAccent,
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
