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
} from '../components/confirmDestructive';
import { discardStagedEditsWording } from '../components/confirmDestructiveMessage';
import { ScreenHeader } from '../components/ScreenHeader';
import {
  itineraryLoadMessage,
  ScreenMessage,
} from '../components/ScreenMessage';
import {
  CAPTION_LABEL,
  CAPTION_PLACEHOLDER,
  DELETE_ENTRY_LABEL,
  DELETE_ENTRY_SUBJECT,
  ENTRY_TITLE,
  PHOTOS_LABEL,
  SAVE_TO_DIARY_LABEL,
} from './diaryCopy';
import { MAX_DIARY_PHOTOS, roomLeft } from './diaryCapture';
import {
  hasUnsavedChanges,
  stagedFrom,
  stagedPhotoCount,
  tilesOf,
  withoutTile,
  type StagedEntry,
} from './stagedEntry';
import { DiaryPrivacyNote } from './DiaryPrivacyNote';
import { diaryEditorStyles } from './diaryEditorStyles';
import { afterDeleteRoute, afterSaveRoute, type DiaryEntryExit } from './diaryEntryExit';
import { snapshotEyebrow } from './postcardAnatomy';
import { LocationTag } from '../places/LocationTag';
import { DiaryAddRow } from './DiaryAddRow';
import { DiaryPhotoTile } from './DiaryPhotoTile';
import { DumpPickerModal } from './DumpPickerModal';
import { flattenPhotoDumpPages } from '../media/photoDumpGrid';
import { usePhotoAction } from '../media/usePhotoAction';
import { useExitGuard } from '../navigation/useExitGuard';
import {
  useDeleteDiaryEntry,
  useMyDiaryEntries,
  useSaveDiaryEntry,
} from '../query/diaryQueries';
import { useItinerary, usePhotoDump } from '../query/itineraryQueries';
import { colors, radii, spacing, typography } from '../theme';
import {
  diaryColors,
  diaryMetrics,
  diaryTypography,
  workspaceColors,
  workspaceMetrics,
  workspaceRadii,
} from '../theme/workspaceTokens';


export function DiaryEntryScreen({ exit = 'trip' }: { readonly exit?: DiaryEntryExit } = {}) {
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
    void photoAction.run(async () => {
      await save.mutateAsync({ staged: editing, savedPhotoCount: entry.photos.length });
      setStaged(null);
      router.replace(afterSaveRoute(exit, id, entry.activityTitle));
    });
  };

  const deleteEntry = () => {
    confirmDestructive(DELETE_ENTRY_SUBJECT, () => {
      void photoAction.run(async () => {
        setStaged(null);
        await remove.mutateAsync(entryId);
        router.replace(afterDeleteRoute(exit, id));
      });
    });
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={ENTRY_TITLE} size="heading" back />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.snapshotHeader}>
          <Text style={styles.eyebrow}>{snapshotEyebrow(entry)}</Text>
          <Text style={styles.title}>{entry.activityTitle}</Text>
          <LocationTag place={entry.place} destination={trip.data?.destination ?? null} />
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
            <DiaryAddRow
              full={room === 0}
              onPickFromDevice={pickFromDevice}
              onOpenDump={() => setDumpPickerOpen(true)}
            />
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
              style={[styles.cta, !dirty && styles.ctaDisabled]}
              onPress={saveEntry}
              disabled={!dirty || save.isPending}
              accessibilityRole="button"
              accessibilityLabel={SAVE_TO_DIARY_LABEL}
              accessibilityState={{ disabled: !dirty || save.isPending }}
            >
              {save.isPending ? (
                <ActivityIndicator color={workspaceColors.onAccent} />
              ) : (
                <Text style={styles.ctaLabel}>{SAVE_TO_DIARY_LABEL}</Text>
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
  ...diaryEditorStyles,
  snapshotHeader: {
    gap: spacing.xs,
    alignItems: 'flex-start',
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
