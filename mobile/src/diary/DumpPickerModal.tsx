import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { addPhotosLabel, togglePick } from './diaryCapture';
import {
  DUMP_EMPTY,
  DUMP_PICKER_CANCEL,
  DUMP_PICKER_FULL,
  DUMP_PICKER_TITLE,
} from './diaryCopy';
import { DiaryPhotoTile } from './DiaryPhotoTile';
import type { PhotoDumpEntryResponse } from '../types/api';
import { spacing } from '../theme';
import {
  diaryMetrics,
  diaryTypography,
  workspaceColors,
  workspaceMetrics,
  workspaceRadii,
  workspaceTypography,
} from '../theme/workspaceTokens';


interface DumpPickerModalProps {
  readonly visible: boolean;
  readonly photos: readonly PhotoDumpEntryResponse[];
  readonly room: number;
  readonly onAdd: (photoIds: readonly string[]) => void;
  readonly onDismiss: () => void;
}


export function DumpPickerModal({
  visible,
  photos,
  room,
  onAdd,
  onDismiss,
}: DumpPickerModalProps) {
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (visible) setPicked([]);
  }, [visible]);

  const roomLeft = room - picked.length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss} accessibilityLabel={DUMP_PICKER_CANCEL}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.grabber} />
          <Text style={styles.title}>{DUMP_PICKER_TITLE}</Text>

          {photos.length === 0 ? (
            <Text style={styles.empty}>{DUMP_EMPTY}</Text>
          ) : (
            <ScrollView style={styles.scroller} contentContainerStyle={styles.grid}>
              {photos.map((photo) => (
                <DiaryPhotoTile
                  key={photo.id}
                  url={photo.url}
                  accessibilityLabel={`Photo Dump photo${picked.includes(photo.id) ? ', selected' : ''}`}
                  selected={picked.includes(photo.id)}
                  onPress={() => setPicked((chosen) => togglePick(chosen, photo.id, roomLeft))}
                />
              ))}
            </ScrollView>
          )}

          {roomLeft <= 0 && photos.length > 0 ? (
            <Text style={styles.full}>{DUMP_PICKER_FULL}</Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              style={[styles.add, picked.length === 0 && styles.addDisabled]}
              disabled={picked.length === 0}
              onPress={() => onAdd(picked)}
              accessibilityRole="button"
              accessibilityLabel={addPhotosLabel(picked.length)}
              accessibilityState={{ disabled: picked.length === 0 }}
            >
              <Text style={styles.addLabel}>{addPhotosLabel(picked.length)}</Text>
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
const GRID_MAX_HEIGHT = 360;


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
  empty: {
    ...diaryTypography.note,
    color: workspaceColors.muted,
    alignSelf: 'flex-start',
  },
  scroller: {
    alignSelf: 'stretch',
    maxHeight: GRID_MAX_HEIGHT,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  full: {
    ...diaryTypography.note,
    color: workspaceColors.muted,
    alignSelf: 'flex-start',
  },
  actions: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  add: {
    height: diaryMetrics.ctaHeight,
    borderRadius: workspaceRadii.control,
    backgroundColor: workspaceColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDisabled: {
    opacity: 0.5,
  },
  addLabel: {
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
