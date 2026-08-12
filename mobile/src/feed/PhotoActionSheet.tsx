import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '../components/Icon';
import { radii, spacing } from '../theme';
import { feedColors, feedMetrics, feedTypography } from '../theme/feedTokens';
import {
  PHOTO_SHEET_CANCEL,
  PHOTO_SHEET_REPORT,
  PHOTO_SHEET_SAVE,
  PHOTO_SHEET_SHARE,
} from './feedCopy';

export type PhotoSheetAction = 'save' | 'share' | 'report';

const SHEET_MAX_WIDTH = 420;

const ACTIONS: ReadonlyArray<{ key: PhotoSheetAction; label: string; icon: IconName }> = [
  { key: 'save', label: PHOTO_SHEET_SAVE, icon: 'bookmark' },
  { key: 'share', label: PHOTO_SHEET_SHARE, icon: 'share' },
  { key: 'report', label: PHOTO_SHEET_REPORT, icon: 'info' },
];


interface PhotoActionSheetProps {
  readonly open: boolean;
  readonly onChoose: (action: PhotoSheetAction) => void;
  readonly onDismiss: () => void;
}


export function PhotoActionSheet({ open, onChoose, onDismiss }: PhotoActionSheetProps) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.scrim} onPress={onDismiss} accessibilityRole="button" accessibilityLabel={PHOTO_SHEET_CANCEL}>
        <View style={styles.sheet}>
          {ACTIONS.map((action) => (
            <Pressable
              key={action.key}
              style={styles.action}
              onPress={() => onChoose(action.key)}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <Icon name={action.icon} size={feedMetrics.actionGlyph} color={feedColors.glyphIdle} />
              <Text style={styles.label}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}


const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: feedColors.sheetScrim,
  },
  sheet: {
    width: '100%',
    maxWidth: SHEET_MAX_WIDTH,
    backgroundColor: feedColors.cardSurface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingVertical: spacing.sm,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm3,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md2,
  },
  label: {
    ...feedTypography.caughtUpTitle,
    color: feedColors.caption,
  },
});
