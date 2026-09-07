import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { stillShowing } from '../components/stillShowing';
import { memoryColors, memoryMetrics, memoryMotion, memoryTypography } from '../theme/memoryTokens';


export type MemoryConfirmWording = {
  readonly title: string;
  readonly body: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
};


interface Pending {
  readonly wording: MemoryConfirmWording;
  readonly onConfirm: () => void;
}


let present: ((pending: Pending) => void) | null = null;


export function askMemoryConfirmation(wording: MemoryConfirmWording, onConfirm: () => void): boolean {
  if (present === null) return false;
  present({ wording, onConfirm });
  return true;
}


export const MEMORY_CONFIRM_TESTID = 'memory-confirm';


export function MemoryConfirmStation() {
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

  const { title, body, confirmLabel, cancelLabel } = shown.wording;

  return (
    <Modal visible={pending !== null} transparent animationType="fade">
      <View style={styles.scrim}>
        <View style={styles.dialog} testID={MEMORY_CONFIRM_TESTID}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) =>
                StyleSheet.flatten([styles.button, styles.cancel, pressed ? styles.pressed : null])
              }
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              onPress={() => setPending(null)}
            >
              <Text style={styles.cancelInk}>{cancelLabel}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) =>
                StyleSheet.flatten([styles.button, styles.confirm, pressed ? styles.pressed : null])
              }
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              onPress={() => {
                setPending(null);
                shown.onConfirm();
              }}
            >
              <Text style={styles.confirmInk}>{confirmLabel}</Text>
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
    backgroundColor: memoryColors.confirmScrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    width: memoryMetrics.confirmWidth,
    maxWidth: memoryMetrics.frameWidth,
    backgroundColor: memoryColors.card,
    borderRadius: memoryMetrics.confirmRadius,
    paddingTop: memoryMetrics.confirmPaddingTop,
    paddingHorizontal: memoryMetrics.confirmPaddingH,
    paddingBottom: memoryMetrics.confirmPaddingBottom,
    shadowColor: memoryColors.title,
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.35,
    shadowRadius: 60,
    elevation: 24,
    gap: 8,
  },
  title: {
    ...memoryTypography.confirmTitle,
    color: memoryColors.title,
  },
  body: {
    ...memoryTypography.confirmBody,
    color: memoryColors.muted,
  },
  actions: {
    flexDirection: 'row',
    gap: memoryMetrics.confirmButtonGap,
    marginTop: 8,
  },
  button: {
    flex: 1,
    height: memoryMetrics.confirmButton,
    borderRadius: memoryMetrics.confirmButtonRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancel: {
    backgroundColor: memoryColors.cancelWell,
  },
  confirm: {
    backgroundColor: memoryColors.danger,
  },
  cancelInk: {
    ...memoryTypography.confirmButton,
    color: memoryColors.title,
  },
  confirmInk: {
    ...memoryTypography.confirmButton,
    color: memoryColors.white,
  },
  pressed: {
    opacity: memoryMotion.pressOpacity,
  },
});
