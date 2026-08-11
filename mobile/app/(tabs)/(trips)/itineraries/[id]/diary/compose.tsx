import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
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
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import {
  itineraryLoadMessage,
  ScreenMessage,
} from '../../../../../../src/components/ScreenMessage';
import {
  ADD_FROM_CAMERA_ROLL,
  CAPTION_LABEL,
  CAPTION_PLACEHOLDER,
  COMPOSE_CTA,
  COMPOSE_TITLE,
  PHOTOS_EMPTY,
  PHOTOS_LABEL,
  PICK_FROM_DUMP,
} from '../../../../../../src/diary/diaryCopy';
import {
  canSubmit,
  MAX_DIARY_PHOTOS,
  roomLeft,
} from '../../../../../../src/diary/diaryCapture';
import { DiaryPrivacyNote } from '../../../../../../src/diary/DiaryPrivacyNote';
import { snapshotEyebrow } from '../../../../../../src/diary/postcardAnatomy';
import { DiaryAddTile, DiaryPhotoTile } from '../../../../../../src/diary/DiaryPhotoTile';
import { DumpPickerModal } from '../../../../../../src/diary/DumpPickerModal';
import { dayHeading } from '../../../../../../src/itineraries/dayHeading';
import { flattenPhotoDumpPages } from '../../../../../../src/media/photoDumpGrid';
import { usePhotoAction } from '../../../../../../src/media/usePhotoAction';
import type { PickedPhoto } from '../../../../../../src/media/pickedPhoto';
import type { PhotoDumpEntryResponse } from '../../../../../../src/types/api';
import { usePostDiaryEntry } from '../../../../../../src/query/diaryQueries';
import { useItinerary, usePhotoDump } from '../../../../../../src/query/itineraryQueries';
import { colors, radii, spacing, typography } from '../../../../../../src/theme';
import {
  diaryColors,
  diaryMetrics,
  diaryTypography,
  workspaceColors,
} from '../../../../../../src/theme/workspaceTokens';



export default function ComposeDiaryEntryScreen() {
  const router = useRouter();
  const { id, activityId, dayId } = useLocalSearchParams<{
    id: string;
    activityId: string;
    dayId: string;
  }>();

  const { data, isPending, isError, error } = useItinerary(id);
  const dump = usePhotoDump(id);
  const post = usePostDiaryEntry(id);
  const photoAction = usePhotoAction();

  const [devicePhotos, setDevicePhotos] = useState<PickedPhoto[]>([]);
  const [fromDump, setFromDump] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [dumpPickerOpen, setDumpPickerOpen] = useState(false);

  if (isPending) return <ActivityIndicator style={styles.loading} color={colors.accent} />;
  if (isError) return <ScreenMessage {...itineraryLoadMessage(error, 'Trip unavailable')} />;

  const day = data.days.find((candidate) => candidate.id === dayId);
  const activity = day?.activities.find((candidate) => candidate.id === activityId);

  if (day === undefined || activity === undefined) {
    return <ScreenMessage title="Activity not found" body="This activity is no longer in the plan." />;
  }

  const dumpPhotos = flattenPhotoDumpPages(dump.data?.pages);
  const total = devicePhotos.length + fromDump.length;
  const room = roomLeft(total);

  const chosenFromDump = fromDump
    .map((id) => dumpPhotos.find((photo) => photo.id === id))
    .filter((photo): photo is PhotoDumpEntryResponse => photo !== undefined);

  const pickFromDevice = () => {
    void photoAction.pickManyAndRun(room, async (picked) => {
      setDevicePhotos((chosen) => [...chosen, ...picked]);
    });
  };

  const submit = () => {
    void photoAction.run(async () => {
      await post.mutateAsync({
        entry: {
          activityId: activity.id,
          caption: caption.trim() === '' ? null : caption.trim(),
          fromDump,
        },
        devicePhotos,
      });
      router.replace({
        pathname: '/itineraries/[id]/diary/posted',
        params: { id, title: activity.title },
      });
    });
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={COMPOSE_TITLE} size="heading" back />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={styles.eyebrow}>
            {snapshotEyebrow({ dayLabel: dayHeading(day), timeOfDay: activity.timeOfDay })}
          </Text>
          <Text style={styles.title}>{activity.title}</Text>
        </View>

        <View style={styles.photoBlock}>
          <View style={styles.photoHeader}>
            <Text style={styles.sectionLabel}>{PHOTOS_LABEL}</Text>
            <Text style={styles.count}>{`${total} / ${MAX_DIARY_PHOTOS}`}</Text>
          </View>

          {total > 0 ? (
            <View style={styles.grid}>
              {devicePhotos.map((photo, index) => (
                <DiaryPhotoTile
                  key={`${photo.uri}-${index}`}
                  url={null}
                  localPreview={photo.uri}
                  accessibilityLabel={`Selected photo ${index + 1}`}
                  source="phone"
                  onRemove={() =>
                    setDevicePhotos((chosen) => chosen.filter((_, at) => at !== index))
                  }
                />
              ))}
              {chosenFromDump.map((photo) => (
                <DiaryPhotoTile
                  key={photo.id}
                  url={photo.url}
                  accessibilityLabel="Selected Photo Dump photo"
                  source="dump"
                  onRemove={() => setFromDump((chosen) => chosen.filter((id) => id !== photo.id))}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.dumpEmpty}>{PHOTOS_EMPTY}</Text>
          )}

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
        </View>

        <View>
          <Text style={styles.sectionLabel}>{CAPTION_LABEL}</Text>
          <TextInput
            style={styles.caption}
            value={caption}
            onChangeText={setCaption}
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

        <Pressable
          style={[styles.cta, !canSubmit(total) && styles.ctaDisabled]}
          onPress={submit}
          disabled={!canSubmit(total) || post.isPending}
          accessibilityRole="button"
          accessibilityLabel={COMPOSE_CTA}
          accessibilityState={{ disabled: !canSubmit(total) || post.isPending }}
        >
          {post.isPending ? (
            <ActivityIndicator color={workspaceColors.onAccent} />
          ) : (
            <Text style={styles.ctaLabel}>{COMPOSE_CTA}</Text>
          )}
        </Pressable>
      </ScrollView>

      <DumpPickerModal
        visible={dumpPickerOpen}
        photos={dumpPhotos}
        room={room}
        onAdd={(photoIds) => {
          setFromDump((chosen) => [...chosen, ...photoIds]);
          setDumpPickerOpen(false);
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
  filler: {
    flex: 1,
    aspectRatio: 1,
  },
  addRow: {
    flexDirection: 'row',
    gap: diaryMetrics.tileGap,
  },
  dumpEmpty: {
    ...typography.caption,
    color: workspaceColors.muted,
    marginTop: spacing.sm3,
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
  cta: {
    height: diaryMetrics.ctaHeight,
    borderRadius: radii.control,
    backgroundColor: workspaceColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaLabel: {
    ...diaryTypography.cta,
    color: workspaceColors.onAccent,
  },
});
