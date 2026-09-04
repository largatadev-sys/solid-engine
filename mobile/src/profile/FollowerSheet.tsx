import { StyleSheet, Text } from 'react-native';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import { stillShowing } from '../components/stillShowing';
import { BottomSheet } from '../members/BottomSheet';
import { followMetrics, travelerColors, travelerTypography } from '../theme/workspaceTokens';
import type { TravelerCardResponse } from '../types/api';
import { handleLabel } from './PersonRow';
import { REMOVE_FOLLOWER_LABEL } from './privateProfileCopy';


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
    <BottomSheet open={follower !== null} title={handleLabel(shown)} onDismiss={onDismiss}>
      <SheetRow
        label={REMOVE_FOLLOWER_LABEL}
        ink={travelerColors.destructive}
        onPress={() => onRemove(shown)}
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
  row: {
    height: followMetrics.sheetRowHeight,
    justifyContent: 'center',
  },
  rowLabel: { ...travelerTypography.rowTitle },
});
