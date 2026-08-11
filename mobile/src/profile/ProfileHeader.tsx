import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { MediaThumb } from '../media/MediaThumb';
import { initialsFor } from '../onboarding/initials';
import { spacing } from '../theme';
import {
  profileColors,
  profileMetrics,
  profileTypography,
  workspaceColors,
  workspaceRadii,
} from '../theme/workspaceTokens';
import { ACCOUNT_LABEL, EDIT_PROFILE_LABEL } from './profileCopy';
import type { ProfileCard } from './profileCard';
import { profileMetaLine } from './profileMetaLine';
import { ProfileStatsRow, type ProfileStats } from './ProfileStatsRow';


interface ProfileHeaderProps {
  readonly card: ProfileCard;
  readonly stats: ProfileStats;
  readonly onEditProfile: () => void;
  readonly onOpenAccount: () => void;
}


export function ProfileHeader({ card, stats, onEditProfile, onOpenAccount }: ProfileHeaderProps) {
  const meta = profileMetaLine(card.handle, card.vanityNumber);

  return (
    <View style={styles.header}>
      <View style={styles.identity}>
        <MediaThumb
          url={card.avatarUrl}
          style={styles.avatar}
          fallbackStyle={styles.avatarWell}
          accessibilityLabel="Your profile photo"
          fallback={<Text style={styles.initials}>{initialsFor(card.displayName, null)}</Text>}
        />

        <View style={styles.identityText}>
          <Text style={styles.displayName} numberOfLines={1}>
            {card.displayName}
          </Text>
          {meta !== null && (
            <Text style={styles.meta} numberOfLines={1}>
              {meta}
            </Text>
          )}
          {card.bio !== null && <Text style={styles.bio}>{card.bio}</Text>}
        </View>

        <Pressable
          style={styles.cog}
          onPress={onOpenAccount}
          accessibilityRole="button"
          accessibilityLabel={ACCOUNT_LABEL}
        >
          <Icon name="settings" size={16} color={workspaceColors.sheetBody} />
        </Pressable>
      </View>

      <ProfileStatsRow stats={stats} />

      <Pressable
        style={styles.editPill}
        onPress={onEditProfile}
        accessibilityRole="button"
        accessibilityLabel={EDIT_PROFILE_LABEL}
      >
        <Text style={styles.editLabel}>{EDIT_PROFILE_LABEL}</Text>
      </Pressable>
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
  cog: {
    width: profileMetrics.cogSize,
    height: profileMetrics.cogSize,
    borderRadius: profileMetrics.cogSize / 2,
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },
  editPill: {
    height: profileMetrics.editPillHeight,
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    borderRadius: workspaceRadii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editLabel: {
    ...profileTypography.editPill,
    color: workspaceColors.title,
  },
});
