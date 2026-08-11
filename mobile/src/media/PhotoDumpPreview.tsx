import { useRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import {
  workspaceColors,
  workspaceMetrics,
  workspaceRadii,
  workspaceTypography,
} from '../theme/workspaceTokens';
import type { PhotoDumpEntryResponse } from '../types/api';
import { MediaThumb } from './MediaThumb';
import {
  PHOTO_DUMP_PREVIEW_CLOSE_LABEL,
  PHOTO_DUMP_PREVIEW_DELETE_LABEL,
  PHOTO_DUMP_PREVIEW_LABEL,
} from './photoDumpMessages';


interface PhotoDumpPreviewProps {
  readonly photo: PhotoDumpEntryResponse | null;
  readonly deletable: boolean;
  readonly busy: boolean;
  readonly onDelete: () => void;
  readonly onDismiss: () => void;
}


function useRetainedWhileClosing(
  photo: PhotoDumpEntryResponse | null,
): PhotoDumpEntryResponse | null {
  const last = useRef<PhotoDumpEntryResponse | null>(photo);
  if (photo !== null) last.current = photo;
  return photo ?? last.current;
}


export function PhotoDumpPreview({
  photo,
  deletable,
  busy,
  onDelete,
  onDismiss,
}: PhotoDumpPreviewProps) {
  const shown = useRetainedWhileClosing(photo);

  return (
    <Modal
      visible={photo !== null}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onDismiss}
        accessibilityLabel={PHOTO_DUMP_PREVIEW_CLOSE_LABEL}
      >
        <Pressable style={styles.dialog} onPress={() => undefined}>
          {shown !== null && (
            <MediaThumb
              url={shown.url}
              full
              style={styles.photo}
              accessibilityLabel={PHOTO_DUMP_PREVIEW_LABEL}
            />
          )}

          <View style={styles.actions}>
            {deletable && (
              <Pressable
                style={styles.delete}
                disabled={busy}
                onPress={onDelete}
                accessibilityRole="button"
                accessibilityLabel={PHOTO_DUMP_PREVIEW_DELETE_LABEL}
              >
                <Text style={styles.deleteLabel}>{PHOTO_DUMP_PREVIEW_DELETE_LABEL}</Text>
              </Pressable>
            )}

            <Pressable
              style={styles.dismiss}
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel={PHOTO_DUMP_PREVIEW_CLOSE_LABEL}
            >
              <Text style={styles.dismissLabel}>{PHOTO_DUMP_PREVIEW_CLOSE_LABEL}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}


const DIALOG_MAX_WIDTH = 420;


const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: workspaceColors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  dialog: {
    width: '100%',
    maxWidth: DIALOG_MAX_WIDTH,
    backgroundColor: workspaceColors.surface,
    borderRadius: workspaceRadii.card,
    padding: 16,
    gap: 16,
    alignItems: 'center',
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: workspaceRadii.card,
    backgroundColor: workspaceColors.hairline,
  },
  actions: {
    alignSelf: 'stretch',
    gap: 8,
  },
  delete: {
    height: workspaceMetrics.sheetCtaHeight,
    borderRadius: workspaceRadii.control,
    borderWidth: 1.5,
    borderColor: workspaceColors.railBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteLabel: {
    ...workspaceTypography.sheetDismiss,
    color: colors.danger,
  },
  dismiss: {
    height: workspaceMetrics.sheetCtaHeight,
    borderRadius: workspaceRadii.control,
    backgroundColor: workspaceColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissLabel: {
    ...workspaceTypography.ctaPrimary,
    color: workspaceColors.onAccent,
  },
});
