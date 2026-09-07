import { Pressable, StyleSheet, Text, View } from 'react-native';
import { POST_SHEET_TITLE, PROFILE_TITLE } from '../diary/memoryCopy';
import { MemoryIcon } from '../diary/MemoryIcon';
import { Icon } from '../components/Icon';
import { MediaThumb } from '../media/MediaThumb';
import { initialsFor } from '../onboarding/initials';
import { spacing } from '../theme';
import { memoryColors, memoryMetrics, memoryMotion, memoryTypography } from '../theme/memoryTokens';
import { profileTypography, workspaceRadii } from '../theme/workspaceTokens';
import { ACCOUNT_LABEL, EDIT_PROFILE_LABEL } from './profileCopy';
import type { ProfileCard } from './profileCard';
import { profileMetaLine } from './profileMetaLine';
import { ProfileStatsRow, type ProfileStats } from './ProfileStatsRow';


interface ProfileHeaderProps {
  readonly card: ProfileCard;
  readonly stats: ProfileStats;
  readonly onEditProfile: () => void;
  readonly onOpenAccount: () => void;
  readonly onPost: () => void;
}


export function ProfileHeader({
  card,
  stats,
  onEditProfile,
  onOpenAccount,
  onPost,
}: ProfileHeaderProps) {
  const meta = profileMetaLine(card.handle, card.vanityNumber);

  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{PROFILE_TITLE}</Text>
        <View style={styles.titleActions}>
          <RoundButton label={POST_SHEET_TITLE} onPress={onPost}>
            <MemoryIcon name="plusCircle" size={memoryMetrics.navIcon} color={memoryColors.title} />
          </RoundButton>
          <RoundButton label={ACCOUNT_LABEL} onPress={onOpenAccount}>
            <Icon name="settings" size={memoryMetrics.navIcon} color={memoryColors.title} />
          </RoundButton>
        </View>
      </View>

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
            <Text style={styles.handle} numberOfLines={1}>
              {meta}
            </Text>
          )}
          {card.bio !== null && <Text style={styles.bio}>{card.bio}</Text>}
        </View>
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


function RoundButton({
  label,
  onPress,
  children,
}: {
  readonly label: string;
  readonly onPress: () => void;
  readonly children: React.ReactNode;
}) {
  return (
    <Pressable
      style={({ pressed }) =>
        StyleSheet.flatten([styles.roundButton, pressed && styles.roundButtonPressed])
      }
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {children}
    </Pressable>
  );
}


const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md2,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...memoryTypography.profileTitle,
    color: memoryColors.title,
  },
  titleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  roundButton: {
    width: memoryMetrics.headerButton,
    height: memoryMetrics.headerButton,
    borderRadius: memoryMetrics.headerButton / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundButtonPressed: {
    backgroundColor: memoryColors.hover,
    transform: [{ scale: memoryMotion.roundPressScale }],
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
  editPill: {
    height: memoryMetrics.addDayHeight,
    borderWidth: 1,
    borderColor: memoryColors.hairline,
    borderRadius: workspaceRadii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editLabel: {
    ...memoryTypography.outlinedButton,
    color: memoryColors.title,
  },
});
