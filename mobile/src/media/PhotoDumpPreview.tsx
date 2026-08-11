import { useRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { stillShowing } from '../components/stillShowing';
import { colors } from '../theme';
import {
  workspaceColors,
  workspaceMetrics,
  workspaceRadii,
  workspaceTypography,
} from '../theme/workspaceTokens';
import { MediaThumb } from './MediaThumb';
import type { DumpTile } from './photoDumpGrid';
import {
  PHOTO_DUMP_PREVIEW_CLOSE_LABEL,
  PHOTO_DUMP_PREVIEW_DELETE_LABEL,
  PHOTO_DUMP_PREVIEW_LABEL,
} from './photoDumpMessages';


interface PhotoDumpPreviewProps {
  readonly tile: DumpTile | null;
  readonly busy: boolean;
  readonly onDelete: () => void;
  readonly onDismiss: () => void;
}


function useRetainedWhileClosing(tile: DumpTile | null): DumpTile | null {
  const last = useRef<DumpTile | null>(tile);
  if (tile !== null) last.current = tile;
  return stillShowing(tile, last.current);
}


export function PhotoDumpPreview({ tile, busy, onDelete, onDismiss }: PhotoDumpPreviewProps) {
  const shown = useRetainedWhileClosing(tile);
  const deletable = shown?.deletable ?? false;

  return (
    <Modal visible={tile !== null} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable
        style={styles.backdrop}
        onPress={onDismiss}
        accessibilityLabel={PHOTO_DUMP_PREVIEW_CLOSE_LABEL}
      >
        <Pressable style={styles.dialog} onPress={() => undefined}>
          {shown !== null && (
            <MediaThumb
              url={shown.photo.url}
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
