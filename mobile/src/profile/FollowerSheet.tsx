import { StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import { stillShowing } from '../components/stillShowing';
import { BottomSheet } from '../members/BottomSheet';
import { MediaThumb } from '../media/MediaThumb';
import { initialsFor } from '../onboarding/initials';
import { spacing } from '../theme';
import {
  followColors,
  followMetrics,
  profileColors,
  profileTypography,
  travelerColors,
  travelerTypography,
} from '../theme/workspaceTokens';
import type { TravelerCardResponse } from '../types/api';
import { handleLabel, personLabel } from './PersonRow';
import { REMOVE_FOLLOWER_DISMISS_LABEL, REMOVE_FOLLOWER_LABEL } from './privateProfileCopy';


interface FollowerSheetProps {
  readonly follower: TravelerCardResponse | null;
  readonly lastFollower: TravelerCardResponse | null;
  readonly onRemove: (follower: TravelerCardResponse) => void;
  readonly onDismiss: () => void;
}


export function FollowerSheet({
  follower,
  lastFollower,
  onRemove,
  onDismiss,
}: FollowerSheetProps) {
  const shown = stillShowing(follower, lastFollower);
  if (shown === null) {
    return null;
  }

  return (
    <BottomSheet open={follower !== null} title={personLabel(shown)} onDismiss={onDismiss}>
      <View style={styles.identity}>
        <MediaThumb
          url={shown.avatarUrl}
          style={styles.avatar}
          fallbackStyle={styles.avatarWell}
          accessibilityLabel={`Profile photo of ${personLabel(shown)}`}
          fallback={<Text style={styles.initials}>{initialsFor(shown.displayName, null)}</Text>}
        />
        <View style={styles.identityText}>
          <Text style={styles.name} numberOfLines={1}>
            {personLabel(shown)}
          </Text>
          <Text style={styles.handle} numberOfLines={1}>
            {handleLabel(shown)}
          </Text>
        </View>
      </View>

      <View style={styles.hairline} />

      <SheetRow
        label={REMOVE_FOLLOWER_LABEL}
        ink={travelerColors.destructive}
        onPress={() => onRemove(shown)}
      />
      <SheetRow
        label={REMOVE_FOLLOWER_DISMISS_LABEL}
        ink={travelerColors.ink}
        onPress={onDismiss}
      />
    </BottomSheet>
  );
}


function SheetRow({
  label,
  ink,
  onPress,
}: {
  readonly label: string;
  readonly ink: string;
  readonly onPress: () => void;
}) {
  const press = usePressFeedback();

  return (
    <AnimatedPressable
      style={StyleSheet.flatten([styles.row, press.style])}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.rowLabel, { color: ink }]}>{label}</Text>
    </AnimatedPressable>
  );
}


const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm2,
    paddingBottom: spacing.sm2,
  },
  avatar: {
    width: followMetrics.sheetAvatar,
    height: followMetrics.sheetAvatar,
    borderRadius: followMetrics.sheetAvatar / 2,
  },
  avatarWell: { backgroundColor: profileColors.avatarWell },
  initials: { ...profileTypography.personInitials, color: profileColors.avatarInk },
  identityText: { flex: 1, gap: spacing.hair },
  name: { ...travelerTypography.rowTitle, color: travelerColors.ink },
  handle: { ...profileTypography.meta, color: profileColors.meta },
  hairline: {
    height: 1,
    backgroundColor: followColors.followingBorder,
  },
  row: {
    height: followMetrics.sheetRowHeight,
    justifyContent: 'center',
  },
  rowLabel: { ...travelerTypography.rowTitle },
});
