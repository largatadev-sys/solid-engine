import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  confirmDestructive,
  confirmWith,
} from '../../../../../../src/components/confirmDestructive';
import { discardStagedEditsWording } from '../../../../../../src/components/confirmDestructiveMessage';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import {
  itineraryLoadMessage,
  ScreenMessage,
} from '../../../../../../src/components/ScreenMessage';
import {
  ADD_FROM_CAMERA_ROLL,
  CAPTION_LABEL,
  CAPTION_PLACEHOLDER,
  DELETE_ENTRY_LABEL,
  DELETE_ENTRY_SUBJECT,
  ENTRY_TITLE,
  PHOTOS_LABEL,
  PICK_FROM_DUMP,
  SAVE_TO_DIARY_LABEL,
} from '../../../../../../src/diary/diaryCopy';
import { MAX_DIARY_PHOTOS, roomLeft } from '../../../../../../src/diary/diaryCapture';
import {
  hasUnsavedChanges,
  stagedFrom,
  stagedPhotoCount,
  tilesOf,
  withoutTile,
  type StagedEntry,
} from '../../../../../../src/diary/stagedEntry';
import { DiaryPrivacyNote } from '../../../../../../src/diary/DiaryPrivacyNote';
import { snapshotEyebrow } from '../../../../../../src/diary/postcardAnatomy';
import { DiaryAddTile, DiaryPhotoTile } from '../../../../../../src/diary/DiaryPhotoTile';
import { DumpPickerModal } from '../../../../../../src/diary/DumpPickerModal';
import { flattenPhotoDumpPages } from '../../../../../../src/media/photoDumpGrid';
import { usePhotoAction } from '../../../../../../src/media/usePhotoAction';
import { useExitGuard } from '../../../../../../src/navigation/useExitGuard';
import {
  useDeleteDiaryEntry,
  useMyDiaryEntries,
  useSaveDiaryEntry,
} from '../../../../../../src/query/diaryQueries';
import { useItinerary, usePhotoDump } from '../../../../../../src/query/itineraryQueries';
import { colors, radii, spacing, typography } from '../../../../../../src/theme';
import {
  diaryColors,
  diaryMetrics,
  diaryTypography,
  workspaceColors,
  workspaceMetrics,
  workspaceRadii,
} from '../../../../../../src/theme/workspaceTokens';


export default function DiaryEntryScreen() {
  const router = useRouter();
  const { id, entryId } = useLocalSearchParams<{ id: string; entryId: string }>();

  const trip = useItinerary(id);
  const entries = useMyDiaryEntries(id, true);
  const dump = usePhotoDump(id);

  const entry = entries.data?.find((candidate) => candidate.id === entryId);
  const archived = trip.data?.archived ?? false;

  const save = useSaveDiaryEntry(id, entryId);
  const remove = useDeleteDiaryEntry(id);
  const photoAction = usePhotoAction();

  const [staged, setStaged] = useState<StagedEntry | null>(null);
  const [dumpPickerOpen, setDumpPickerOpen] = useState(false);

  const savedAt = entry?.updatedAt;
  useEffect(() => {
    setStaged(null);
  }, [savedAt]);

  const dirty = entry !== undefined && staged !== null && hasUnsavedChanges(staged, entry);

  useExitGuard(
    dirty,
    useCallback((proceed: () => void) => {
      confirmWith(discardStagedEditsWording(), () => {
        setStaged(null);
        proceed();
      });
    }, []),
  );

  if (entries.isPending || trip.isPending) {
    return <ActivityIndicator style={styles.loading} color={colors.accent} />;
  }
  if (entries.isError) {
    return <ScreenMessage {...itineraryLoadMessage(entries.error, 'Diary unavailable')} />;
  }
  if (entry === undefined) {
    return <ScreenMessage title="Entry not found" body="This diary entry is no longer here." />;
  }

  const dumpPhotos = flattenPhotoDumpPages(dump.data?.pages);
  const editing = staged ?? stagedFrom(entry);
  const total = stagedPhotoCount(editing);
  const room = roomLeft(total);
  const editable = !archived;
  const tiles = tilesOf(
    editing,
    entry.photos,
    (photoId) => dumpPhotos.find((photo) => photo.id === photoId)?.url ?? null,
  );

  const stage = (next: StagedEntry) => setStaged(next);

  const pickFromDevice = () => {
    void photoAction.pickManyAndRun(room, async (picked) => {
      stage({ ...editing, devicePhotos: [...editing.devicePhotos, ...picked] });
    });
  };

  const saveEntry = () => {
    void photoAction.run(() => save.mutateAsync(editing));
  };

  const deleteEntry = () => {
    confirmDestructive(DELETE_ENTRY_SUBJECT, () => {
      void photoAction.run(async () => {
        setStaged(null);
        await remove.mutateAsync(entryId);
        router.replace({ pathname: '/itineraries/[id]', params: { id } });
      });
    });
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={ENTRY_TITLE} size="heading" back />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={styles.eyebrow}>{snapshotEyebrow(entry)}</Text>
          <Text style={styles.title}>{entry.activityTitle}</Text>
        </View>

        <View style={styles.photoBlock}>
          <View style={styles.photoHeader}>
            <Text style={styles.sectionLabel}>{PHOTOS_LABEL}</Text>
            <Text style={styles.count}>{`${total} / ${MAX_DIARY_PHOTOS}`}</Text>
          </View>

          <View style={styles.grid}>
            {tiles.map((tile, index) => (
              <DiaryPhotoTile
                key={tile.key}
                url={tile.url}
                localPreview={tile.localPreview}
                accessibilityLabel={`Diary photo ${index + 1}`}
                source={tile.source === 'saved' ? undefined : tile.source}
                onRemove={editable ? () => stage(withoutTile(editing, tile)) : undefined}
              />
            ))}
          </View>

          {editable ? (
            <View style={styles.addRow}>
              <DiaryAddTile
                label={ADD_FROM_CAMERA_ROLL}
                accessibilityLabel="Add a photo from your camera roll"
                disabled={room === 0}
                onPress={pickFromDevice}
              />
              <DiaryAddTile
                label={PICK_FROM_DUMP}
                accessibilityLabel="Add a photo from the Photo Dump"
                emphasis="dump"
                disabled={room === 0}
                onPress={() => setDumpPickerOpen(true)}
              />
            </View>
          ) : null}
        </View>

        <View>
          <Text style={styles.sectionLabel}>{CAPTION_LABEL}</Text>
          <TextInput
            style={styles.caption}
            value={editing.caption}
            onChangeText={(next) => stage({ ...editing, caption: next })}
            editable={editable}
            placeholder={CAPTION_PLACEHOLDER}
            placeholderTextColor={workspaceColors.placeholder}
            multiline
            accessibilityLabel={CAPTION_LABEL}
          />
        </View>

        <DiaryPrivacyNote />

        {photoAction.failure !== undefined ? (
          <Text style={styles.failure}>{photoAction.failure}</Text>
        ) : null}

        {editable ? (
          <>
            <Pressable
              style={[styles.saveCaption, !dirty && styles.saveDisabled]}
              onPress={saveEntry}
              disabled={!dirty || save.isPending}
              accessibilityRole="button"
              accessibilityLabel={SAVE_TO_DIARY_LABEL}
              accessibilityState={{ disabled: !dirty || save.isPending }}
            >
              {save.isPending ? (
                <ActivityIndicator color={workspaceColors.onAccent} />
              ) : (
                <Text style={styles.saveCaptionLabel}>{SAVE_TO_DIARY_LABEL}</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.deleteEntry}
              onPress={deleteEntry}
              disabled={remove.isPending}
              accessibilityRole="button"
              accessibilityLabel={DELETE_ENTRY_LABEL}
            >
              <Text style={styles.deleteLabel}>{DELETE_ENTRY_LABEL}</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>

      <DumpPickerModal
        visible={dumpPickerOpen}
        photos={dumpPhotos}
        room={room}
        onAdd={(photoIds) => {
          setDumpPickerOpen(false);
          stage({ ...editing, fromDump: [...editing.fromDump, ...photoIds] });
        }}
        onDismiss={() => setDumpPickerOpen(false)}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  loading: {
    marginTop: spacing.xl,
  },
  body: {
    paddingHorizontal: spacing.md2,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  eyebrow: {
    ...diaryTypography.eyebrow,
    color: diaryColors.eyebrow,
  },
  title: {
    ...diaryTypography.activityTitle,
    color: workspaceColors.title,
    marginTop: spacing.xs,
  },
  sectionLabel: {
    ...diaryTypography.sectionLabel,
    color: diaryColors.sectionLabel,
  },
  photoBlock: {
    gap: spacing.sm3,
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  count: {
    ...diaryTypography.count,
    color: diaryColors.count,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: diaryMetrics.tileGap,
  },
  addRow: {
    flexDirection: 'row',
    gap: diaryMetrics.tileGap,
  },
  caption: {
    marginTop: spacing.sm2,
    backgroundColor: diaryColors.tileWell,
    borderWidth: 1,
    borderColor: diaryColors.fieldBorder,
    borderRadius: radii.md,
    minHeight: diaryMetrics.captionMinHeight,
    padding: diaryMetrics.captionPadding,
    textAlignVertical: 'top',
    ...diaryTypography.caption,
    color: workspaceColors.title,
  },
  failure: {
    ...typography.caption,
    color: colors.danger,
  },
  saveCaption: {
    height: diaryMetrics.ctaHeight,
    borderRadius: diaryMetrics.ctaRadius,
    backgroundColor: workspaceColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDisabled: {
    opacity: 0.5,
  },
  saveCaptionLabel: {
    ...diaryTypography.cta,
    color: workspaceColors.onAccent,
  },
  deleteEntry: {
    height: workspaceMetrics.inputHeight,
    borderRadius: workspaceRadii.control,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteLabel: {
    ...typography.action,
    color: colors.danger,
  },
});
