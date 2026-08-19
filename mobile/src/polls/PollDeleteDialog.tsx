import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { stillShowing } from '../components/stillShowing';
import {
  POLL_DELETE_CONFIRM_LABEL,
  POLL_DELETE_KEEP_LABEL,
  POLL_DELETE_LABEL,
  pollDeleteWording,
} from './pollMessages';
import {
  pollColors,
  pollMetrics,
  pollMotion,
  pollTypography,
  workspaceColors,
  workspaceRadii,
} from '../theme/workspaceTokens';
import type { PollResponse } from '../types/api';


const OVERSHOOT = Easing.bezier(0.34, 1.56, 0.64, 1);


interface PollDeleteDialogProps {
  readonly poll: PollResponse | null;
  readonly busy: boolean;
  readonly onConfirm: () => void;
  readonly onDismiss: () => void;
}


export function PollDeleteDialog({ poll, busy, onConfirm, onDismiss }: PollDeleteDialogProps) {
  const last = useRef<PollResponse | null>(null);
  const entrance = useRef(new Animated.Value(0)).current;
  const open = poll !== null;

  if (poll !== null) {
    last.current = poll;
  }
  const shown = stillShowing(poll, last.current);

  useEffect(() => {
    if (!open) {
      entrance.setValue(0);
      return;
    }
    Animated.timing(entrance, {
      toValue: 1,
      duration: pollMotion.dialogPopMs,
      easing: OVERSHOOT,
      useNativeDriver: true,
    }).start();
  }, [entrance, open]);

  if (shown === null) {
    return null;
  }

  const wording = pollDeleteWording(shown.question, shown.votedCount);
  const scale = entrance.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.scrim} onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Dismiss">
        <Animated.View style={[styles.dialog, { opacity: entrance, transform: [{ scale }] }]}>
          <View style={styles.copy}>
            <Text style={styles.title}>{wording.title}</Text>
            <Text style={styles.body}>{wording.body}</Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[styles.destructive, busy && styles.busy]}
              disabled={busy}
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel={POLL_DELETE_CONFIRM_LABEL}
            >
              <Text style={styles.destructiveLabel}>{POLL_DELETE_LABEL}</Text>
            </Pressable>
            <Pressable
              style={styles.keep}
              disabled={busy}
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel={POLL_DELETE_KEEP_LABEL}
            >
              <Text style={styles.keepLabel}>{POLL_DELETE_KEEP_LABEL}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}


const DIALOG_WIDTH = 300;

const ACTION_HEIGHT = 46;


const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: workspaceColors.scrim,
  },
  dialog: {
    width: DIALOG_WIDTH,
    maxWidth: '100%',
    gap: 16,
    padding: 20,
    paddingTop: 24,
    borderRadius: pollMetrics.cardRadius,
    backgroundColor: workspaceColors.surface,
  },
  copy: {
    gap: 6,
  },
  title: {
    ...pollTypography.dialogTitle,
    color: workspaceColors.title,
  },
  body: {
    ...pollTypography.dialogBody,
    color: pollColors.ink,
  },
  actions: {
    gap: 8,
  },
  destructive: {
    height: ACTION_HEIGHT,
    borderRadius: workspaceRadii.control,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pollColors.danger,
  },
  destructiveLabel: {
    ...pollTypography.optionLabel,
    color: workspaceColors.onAccent,
  },
  keep: {
    height: ACTION_HEIGHT,
    borderRadius: workspaceRadii.control,
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepLabel: {
    ...pollTypography.optionLabel,
    color: workspaceColors.title,
  },
  busy: {
    opacity: 0.45,
  },
});
