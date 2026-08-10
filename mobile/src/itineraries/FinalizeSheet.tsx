import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { MOBILE_FRAME_WIDTH } from '../components/mobileFrameContract';
import {
  workspaceColors,
  workspaceMetrics,
  workspaceRadii,
  workspaceTypography,
} from '../theme/workspaceTokens';


export const FINALIZE_SHEET_TITLE = 'Ready to go?';

export const FINALIZE_SHEET_BODY =
  'Once finalized, the itinerary will be locked for your group to follow. You can always switch back to editing later.';

export const FINALIZE_CONFIRM_LABEL = 'Finalize';

export const FINALIZE_DISMISS_LABEL = 'Keep Editing';


interface FinalizeSheetProps {
  readonly visible: boolean;
  readonly busy: boolean;
  readonly onConfirm: () => void;
  readonly onDismiss: () => void;
}


export function FinalizeSheet({ visible, busy, onConfirm, onDismiss }: FinalizeSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <View style={styles.ring}>
            <View style={styles.disc}>
              <Icon name="check" size={28} color={workspaceColors.onAccent} />
            </View>
          </View>

          <Text style={styles.title}>{FINALIZE_SHEET_TITLE}</Text>
          <Text style={styles.body}>{FINALIZE_SHEET_BODY}</Text>

          <Pressable
            style={styles.confirm}
            onPress={onConfirm}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={FINALIZE_CONFIRM_LABEL}
          >
            <Text style={styles.confirmLabel}>{FINALIZE_CONFIRM_LABEL}</Text>
          </Pressable>

          <Pressable
            style={styles.dismiss}
            onPress={onDismiss}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={FINALIZE_DISMISS_LABEL}
          >
            <Text style={styles.dismissLabel}>{FINALIZE_DISMISS_LABEL}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}


const RING_SIZE = workspaceMetrics.finalizeRingSize;

const DISC_SIZE = workspaceMetrics.finalizeDiscSize;

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: workspaceColors.scrim,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: MOBILE_FRAME_WIDTH,
    backgroundColor: workspaceColors.surface,
    borderTopLeftRadius: workspaceRadii.sheet,
    borderTopRightRadius: workspaceRadii.sheet,
    padding: 24,
    gap: 16,
    alignItems: 'center',
  },
  grabber: {
    width: workspaceMetrics.grabberWidth,
    height: workspaceMetrics.grabberHeight,
    borderRadius: workspaceRadii.pill,
    backgroundColor: workspaceColors.hairline,
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: workspaceColors.accentRing,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    width: DISC_SIZE,
    height: DISC_SIZE,
    borderRadius: DISC_SIZE / 2,
    backgroundColor: workspaceColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...workspaceTypography.sheetTitle,
    color: workspaceColors.title,
    textAlign: 'center',
  },
  body: {
    ...workspaceTypography.sheetBody,
    color: workspaceColors.sheetBody,
    textAlign: 'center',
  },
  confirm: {
    alignSelf: 'stretch',
    height: workspaceMetrics.sheetCtaHeight,
    borderRadius: workspaceRadii.control,
    backgroundColor: workspaceColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmLabel: {
    ...workspaceTypography.ctaPrimary,
    color: workspaceColors.onAccent,
  },
  dismiss: {
    alignSelf: 'stretch',
    height: workspaceMetrics.sheetCtaHeight,
    borderRadius: workspaceRadii.control,
    borderWidth: 1.5,
    borderColor: workspaceColors.railBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissLabel: {
    ...workspaceTypography.sheetDismiss,
    color: workspaceColors.sheetBody,
  },
});
