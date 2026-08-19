import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { MOBILE_FRAME_WIDTH } from '../components/mobileFrameContract';
import { colors, radii, spacing, typography } from '../theme';
import {
  FORK_CANCEL_LABEL,
  FORK_CONFIRM_LABEL,
  FORK_HONESTY_LINE,
  FORK_SHEET_BODY,
  FORK_SHEET_TITLE,
  forkHighlights,
} from './forkCopy';



interface ForkSheetProps {
  readonly visible: boolean;
  readonly busy: boolean;
  readonly sourceHandle: string | null;
  readonly onConfirm: () => void;
  readonly onDismiss: () => void;
}


export function ForkSheet({ visible, busy, sourceHandle, onConfirm, onDismiss }: ForkSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <View style={styles.message}>
            <Text style={styles.title}>{FORK_SHEET_TITLE}</Text>
            <Text style={styles.body}>{FORK_SHEET_BODY}</Text>
          </View>

          <View style={styles.highlights}>
            {forkHighlights(sourceHandle).map((highlight) => (
              <View key={highlight.text} style={styles.highlightRow}>
                <Icon name={highlight.icon} size={HIGHLIGHT_ICON_SIZE} color={colors.accent} />
                <Text style={styles.highlightText}>{highlight.text}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.honesty}>{FORK_HONESTY_LINE}</Text>

          <View style={styles.actions}>
            <Pressable
              style={[styles.confirm, busy && styles.confirmBusy]}
              onPress={onConfirm}
              disabled={busy}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, busy }}
              accessibilityLabel={FORK_CONFIRM_LABEL}
            >
              {busy && <ActivityIndicator size="small" color={colors.textOnAccent} />}
              <Text style={styles.confirmLabel}>{FORK_CONFIRM_LABEL}</Text>
            </Pressable>

            <Pressable
              style={[styles.cancel, busy && styles.cancelDisabled]}
              onPress={onDismiss}
              disabled={busy}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              accessibilityLabel={FORK_CANCEL_LABEL}
            >
              <Text style={styles.cancelLabel}>{FORK_CANCEL_LABEL}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}


const GRABBER_WIDTH = 40;

const GRABBER_HEIGHT = 4;

const HIGHLIGHT_ICON_SIZE = 18;

const CONFIRM_HEIGHT = 53;

const CANCEL_HEIGHT = 49;

const BUSY_OPACITY = 0.6;

const DISABLED_OPACITY = 0.45;

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: MOBILE_FRAME_WIDTH,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm3,
    paddingBottom: spacing.lg,
    gap: spacing.md2,
    alignItems: 'center',
  },
  grabber: {
    width: GRABBER_WIDTH,
    height: GRABBER_HEIGHT,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
  },
  message: { alignSelf: 'stretch', gap: spacing.sm },
  title: { ...typography.sheetTitle, color: colors.textPrimary, textAlign: 'center' },
  body: { ...typography.overviewBody, color: colors.textSecondary, textAlign: 'center' },
  highlights: {
    alignSelf: 'stretch',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm3,
  },
  highlightRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm3 },
  highlightText: { ...typography.highlightRow, color: colors.textPrimary, flexShrink: 1 },
  honesty: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: spacing.sm },
  confirm: {
    flexDirection: 'row',
    height: CONFIRM_HEIGHT,
    borderRadius: radii.control,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm2,
  },
  confirmBusy: { opacity: BUSY_OPACITY },
  confirmLabel: { ...typography.actionLarge, color: colors.textOnAccent },
  cancel: {
    height: CANCEL_HEIGHT,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelDisabled: { opacity: DISABLED_OPACITY },
  cancelLabel: { ...typography.action, color: colors.textPrimary },
});
