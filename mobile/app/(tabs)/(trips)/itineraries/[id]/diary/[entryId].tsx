import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Icon } from '../../../../../../src/components/Icon';
import { confirmDestructive } from '../../../../../../src/components/confirmDestructive';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import {
  itineraryLoadMessage,
  ScreenMessage,
} from '../../../../../../src/components/ScreenMessage';
import {
  CAMERA_ROLL_LABEL,
  CAPTION_LABEL,
  CAPTION_PLACEHOLDER,
  DELETE_ENTRY_LABEL,
  DELETE_ENTRY_SUBJECT,
  DUMP_LABEL,
  ENTRY_TITLE,
} from '../../../../../../src/diary/diaryCopy';
import { canRemovePhoto, roomLeft } from '../../../../../../src/diary/diaryCapture';
import { DiaryPrivacyNote } from '../../../../../../src/diary/DiaryPrivacyNote';
import { snapshotEyebrow } from '../../../../../../src/diary/postcardAnatomy';
import { DiaryAddTile, DiaryPhotoTile } from '../../../../../../src/diary/DiaryPhotoTile';
import { SHOW_SCROLLBAR } from '../../../../../../src/diary/photoStripScroll';
import { flattenPhotoDumpPages } from '../../../../../../src/media/photoDumpGrid';
import { usePhotoAction } from '../../../../../../src/media/usePhotoAction';
import {
  useAddDiaryDevicePhoto,
  useAddDiaryPhotoFromDump,
  useDeleteDiaryEntry,
  useMyDiaryEntries,
  useRecaptionDiaryEntry,
  useRemoveDiaryPhoto,
} from '../../../../../../src/query/diaryQueries';
import { useItinerary, usePhotoDump } from '../../../../../../src/query/itineraryQueries';
import { colors, radii, spacing, typography } from '../../../../../../src/theme';
import {
  diaryColors,
  diaryMetrics,
  diaryTypography,
  workspaceColors,
  workspaceMetrics,
} from '../../../../../../src/theme/workspaceTokens';


const REMOVE_ICON_SIZE = 14;


export default function DiaryEntryScreen() {
  const router = useRouter();
  const { id, entryId } = useLocalSearchParams<{ id: string; entryId: string }>();

  const trip = useItinerary(id);
  const entries = useMyDiaryEntries(id, true);
  const dump = usePhotoDump(id);

  const entry = entries.data?.find((candidate) => candidate.id === entryId);
  const archived = trip.data?.archived ?? false;

  const recaption = useRecaptionDiaryEntry(id, entryId);
  const addDevicePhoto = useAddDiaryDevicePhoto(id, entryId);
  const addFromDump = useAddDiaryPhotoFromDump(id, entryId);
  const removePhoto = useRemoveDiaryPhoto(id, entryId);
  const remove = useDeleteDiaryEntry(id);
  const photoAction = usePhotoAction();

  const [caption, setCaption] = useState<string | null>(null);

  useEffect(() => {
    if (entry !== undefined && caption === null) setCaption(entry.caption ?? '');
  }, [entry, caption]);

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
  const chosenIds = new Set(entry.photos.map((photo) => photo.id));
  const room = roomLeft(entry.photos.length);
  const editable = !archived;

  const saveCaption = () => {
    const next = (caption ?? '').trim();
    if (next === (entry.caption ?? '')) return;
    void photoAction.run(() => recaption.mutateAsync(next === '' ? null : next));
  };

  const deleteEntry = () => {
    confirmDestructive(DELETE_ENTRY_SUBJECT, () => {
      void photoAction.run(async () => {
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

        <View>
          <Text style={styles.sectionLabel}>Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={SHOW_SCROLLBAR}>
            <View style={styles.grid}>
              {entry.photos.map((photo, index) => (
                <View key={photo.id}>
                  <DiaryPhotoTile
                    url={photo.url}
                    accessibilityLabel={`Diary photo ${index + 1}`}
                    selected={false}
                  />
                  {editable && canRemovePhoto(entry.photos.length) ? (
                    <Pressable
                      style={styles.removePhoto}
                      onPress={() => void photoAction.run(() => removePhoto.mutateAsync(photo.id))}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove diary photo ${index + 1}`}
                      hitSlop={6}
                    >
                      <Icon name="trash" size={REMOVE_ICON_SIZE} color={colors.surface} />
                    </Pressable>
                  ) : null}
                </View>
              ))}
              {editable ? (
                <DiaryAddTile
                  label="Add More"
                  accessibilityLabel={CAMERA_ROLL_LABEL}
                  disabled={room === 0}
                  onPress={() => {
                    void photoAction.pickAndRun((picked) => addDevicePhoto.mutateAsync(picked));
                  }}
                />
              ) : null}
            </View>
          </ScrollView>
        </View>

        {editable && dumpPhotos.length > 0 ? (
          <View>
            <Text style={styles.sectionLabel}>{DUMP_LABEL}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={SHOW_SCROLLBAR}>
              <View style={styles.grid}>
                {dumpPhotos.map((photo) => (
                  <DiaryPhotoTile
                    key={photo.id}
                    url={photo.url}
                    accessibilityLabel="Add this Photo Dump photo to your entry"
                    selected={chosenIds.has(photo.id)}
                    onPress={() =>
                      room === 0
                        ? undefined
                        : void photoAction.run(() => addFromDump.mutateAsync(photo.id))
                    }
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        ) : null}

        <View>
          <Text style={styles.sectionLabel}>{CAPTION_LABEL}</Text>
          <TextInput
            style={styles.caption}
            value={caption ?? ''}
            onChangeText={setCaption}
            onBlur={saveCaption}
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
              style={styles.saveCaption}
              onPress={saveCaption}
              disabled={recaption.isPending}
              accessibilityRole="button"
              accessibilityLabel="Save caption"
            >
              <Text style={styles.saveCaptionLabel}>Save caption</Text>
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
  grid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm3,
  },
  removePhoto: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: diaryMetrics.removeBadge,
    height: diaryMetrics.removeBadge,
    borderRadius: radii.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    marginTop: spacing.sm2,
    backgroundColor: diaryColors.tileWell,
    borderWidth: 1,
    borderColor: diaryColors.tileDash,
    borderRadius: radii.control,
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
    borderRadius: radii.control,
    backgroundColor: workspaceColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveCaptionLabel: {
    ...diaryTypography.cta,
    color: workspaceColors.onAccent,
  },
  deleteEntry: {
    height: workspaceMetrics.inputHeight,
    borderRadius: radii.control,
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
