import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MOBILE_FRAME_WIDTH } from './mobileFrameContract';
import { stillShowing } from './stillShowing';
import {
  CANCEL_LABEL,
  CONFIRM_DIALOG_TESTID,
  type ConfirmWording,
} from './confirmDestructiveMessage';
import { travelerColors, travelerRadii, travelerTypography } from '../theme/workspaceTokens';


interface Pending {
  readonly wording: ConfirmWording;
  readonly onConfirm: () => void;
}


let present: ((pending: Pending) => void) | null = null;


export function askForConfirmation(wording: ConfirmWording, onConfirm: () => void): boolean {
  if (present === null) return false;
  present({ wording, onConfirm });
  return true;
}


export function ConfirmStation() {
  const [pending, setPending] = useState<Pending | null>(null);
  const [last, setLast] = useState<Pending | null>(null);

  useEffect(() => {
    present = (next) => {
      setLast(next);
      setPending(next);
    };
    return () => {
      present = null;
    };
  }, []);

  const shown = stillShowing(pending, last);
  if (shown === null) return null;

  const { title, body, confirmLabel, cancelLabel, tone } = shown.wording;
  const destructive = tone !== 'accent';

  return (
    <Modal visible={pending !== null} transparent animationType="fade">
      <View style={styles.scrim}>
        <View style={styles.dialog} testID={CONFIRM_DIALOG_TESTID}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>

          <View style={styles.actions}>
            <Pressable
              style={styles.cancel}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel ?? CANCEL_LABEL}
              onPress={() => setPending(null)}
            >
              <Text style={styles.cancelLabel}>{cancelLabel ?? CANCEL_LABEL}</Text>
            </Pressable>

            <Pressable
              style={styles.confirm}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              onPress={() => {
                setPending(null);
                shown.onConfirm();
              }}
            >
              <Text style={destructive ? styles.destructiveLabel : styles.accentLabel}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: travelerColors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  dialog: {
    width: '100%',
    maxWidth: MOBILE_FRAME_WIDTH - 72,
    backgroundColor: travelerColors.surface,
    borderRadius: travelerRadii.alert,
    overflow: 'hidden',
  },
  title: {
    ...travelerTypography.alertTitle,
    color: travelerColors.ink,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 6,
  },
  body: {
    ...travelerTypography.alertBody,
    color: travelerColors.muted,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: travelerColors.hairline,
  },
  cancel: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: travelerColors.hairline,
  },
  confirm: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelLabel: {
    ...travelerTypography.alertAction,
    color: travelerColors.muted,
  },
  destructiveLabel: {
    ...travelerTypography.alertAction,
    color: travelerColors.destructive,
  },
  accentLabel: {
    ...travelerTypography.alertAction,
    color: travelerColors.accent,
  },
});
