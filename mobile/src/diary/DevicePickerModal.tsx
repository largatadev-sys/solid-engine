import { useEffect, useRef } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  DEVICE_PICKER_BODY,
  DEVICE_PICKER_OPEN,
  DEVICE_PICKER_TITLE,
  DUMP_PICKER_CANCEL,
} from './diaryCopy';
import { spacing } from '../theme';
import {
  diaryMetrics,
  diaryTypography,
  workspaceColors,
  workspaceMetrics,
  workspaceRadii,
  workspaceTypography,
} from '../theme/workspaceTokens';


interface DevicePickerModalProps {
  readonly visible: boolean;
  readonly busy: boolean;
  readonly failure: string | undefined;
  readonly onPick: () => void;
  readonly onDismiss: () => void;
}


export function DevicePickerModal({
  visible,
  busy,
  failure,
  onPick,
  onDismiss,
}: DevicePickerModalProps) {
  const opened = useRef(false);

  useEffect(() => {
    if (!visible) {
      opened.current = false;
      return;
    }
    if (opened.current) return;
    opened.current = true;
    onPick();
  }, [visible, onPick]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss} accessibilityLabel={DUMP_PICKER_CANCEL}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.grabber} />
          <Text style={styles.title}>{DEVICE_PICKER_TITLE}</Text>
          <Text style={styles.body}>{DEVICE_PICKER_BODY}</Text>

          {failure !== undefined ? <Text style={styles.failure}>{failure}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              style={styles.open}
              disabled={busy}
              onPress={onPick}
              accessibilityRole="button"
              accessibilityLabel={DEVICE_PICKER_OPEN}
              accessibilityState={{ disabled: busy }}
            >
              {busy ? (
                <ActivityIndicator color={workspaceColors.onAccent} />
              ) : (
                <Text style={styles.openLabel}>{DEVICE_PICKER_OPEN}</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.cancel}
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel={DUMP_PICKER_CANCEL}
            >
              <Text style={styles.cancelLabel}>{DUMP_PICKER_CANCEL}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}


const SHEET_MAX_WIDTH = 420;


const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: workspaceColors.scrim,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: SHEET_MAX_WIDTH,
    backgroundColor: workspaceColors.surface,
    borderTopLeftRadius: workspaceRadii.sheet,
    borderTopRightRadius: workspaceRadii.sheet,
    padding: spacing.md,
    gap: spacing.sm3,
    alignItems: 'center',
  },
  grabber: {
    width: workspaceMetrics.grabberWidth,
    height: workspaceMetrics.grabberHeight,
    borderRadius: workspaceRadii.pill,
    backgroundColor: workspaceColors.hairline,
  },
  title: {
    ...workspaceTypography.sheetTitle,
    color: workspaceColors.title,
    alignSelf: 'flex-start',
  },
  body: {
    ...diaryTypography.note,
    color: workspaceColors.muted,
    alignSelf: 'flex-start',
  },
  failure: {
    ...diaryTypography.note,
    color: workspaceColors.accent,
    alignSelf: 'flex-start',
  },
  actions: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  open: {
    height: diaryMetrics.ctaHeight,
    borderRadius: workspaceRadii.control,
    backgroundColor: workspaceColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openLabel: {
    ...diaryTypography.cta,
    color: workspaceColors.onAccent,
  },
  cancel: {
    height: workspaceMetrics.secondaryCtaHeight,
    borderRadius: workspaceRadii.control,
    borderWidth: 1,
    borderColor: workspaceColors.railBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    ...workspaceTypography.ctaSecondary,
    color: workspaceColors.sheetBody,
  },
});
