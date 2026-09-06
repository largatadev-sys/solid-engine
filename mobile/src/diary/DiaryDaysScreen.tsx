import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import { askForConfirmation } from '../components/ConfirmStation';
import { useExitGuard } from '../navigation/useExitGuard';
import { MediaThumb } from '../media/MediaThumb';
import { pickPhotos } from '../media/pickPhoto';
import { memoryRepository } from '../repositories/memoryRepository';
import { memoryColors, memoryMetrics, memoryTypography } from '../theme/memoryTokens';
import {
  draftsFor,
  isWorthSaving,
  replacedAt,
  unsavedAmong,
  withPhotos,
  withoutPhotoAt,
  type DayDraft,
} from './diaryDayDraft';
import {
  DAY_ADD_PHOTO,
  DAY_CAPTION_LABEL,
  DAY_PHOTOS_LABEL,
  DAY_PLACE_LABEL,
  DAY_PLACE_PLACEHOLDER,
  DISCARD_ACTION,
  DISCARD_DIARY_BODY,
  DISCARD_DIARY_TITLE,
  DIARY_DAYS_HINT,
  DIARY_DAYS_SUBTITLE,
  DIARY_POST_CTA,
  KEEP_EDITING_ACTION,
  NEW_DIARY_BADGE,
  dayHeading,
  photoCountLabel,
} from './memoryCopy';


interface DiaryDaysScreenProps {
  readonly diaryId: string;
  readonly title: string;
  readonly candidateDates: readonly string[];
  readonly onPosted: () => void;
  readonly onDiscarded: () => void;
}


export function DiaryDaysScreen({
  diaryId,
  title,
  candidateDates,
  onPosted,
  onDiscarded,
}: DiaryDaysScreenProps) {
  const [drafts, setDrafts] = useState<DayDraft[]>(() => draftsFor(candidateDates));
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);

  useExitGuard(!posted, (proceed) => {
    askForConfirmation(
      {
        title: DISCARD_DIARY_TITLE,
        body: DISCARD_DIARY_BODY,
        confirmLabel: DISCARD_ACTION,
        cancelLabel: KEEP_EDITING_ACTION,
        tone: 'destructive',
      },
      () => {
        void memoryRepository.deleteDiary(diaryId).then(() => {
          setPosted(true);
          onDiscarded();
          proceed();
        });
      },
    );
  });

  async function saveDay(index: number): Promise<void> {
    const draft = drafts[index];
    if (draft === undefined || !isWorthSaving(draft) || draft.savedDayId !== null) return;

    const day = await memoryRepository.addDay(diaryId, {
      date: draft.date,
      place: draft.place.trim() === '' ? null : draft.place.trim(),
    });
    await memoryRepository.postOnDay(
      diaryId,
      day.id,
      { caption: draft.caption.trim() === '' ? null : draft.caption.trim(), place: null },
      draft.photos,
    );

    setDrafts((current) => replacedAt(current, index, { ...draft, savedDayId: day.id }));
  }

  async function post(): Promise<void> {
    setPosting(true);
    try {
      for (const draft of unsavedAmong(drafts)) {
        await saveDay(drafts.indexOf(draft));
      }
      setPosted(true);
      onPosted();
    } finally {
      setPosting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.badge}>{NEW_DIARY_BADGE}</Text>
        <Text style={styles.heading}>{title}</Text>
        <Text style={styles.subtitle}>{DIARY_DAYS_SUBTITLE}</Text>

        {drafts.map((draft, index) => (
          <DayCard
            key={draft.date}
            draft={draft}
            ordinal={index + 1}
            onChange={(next) => setDrafts((current) => replacedAt(current, index, next))}
            onLeave={() => void saveDay(index)}
          />
        ))}

        <Text style={styles.hint}>{DIARY_DAYS_HINT}</Text>
      </ScrollView>

      <View style={styles.rail}>
        <AnimatedPressable
          style={styles.cta}
          disabled={posting}
          accessibilityRole="button"
          accessibilityLabel={DIARY_POST_CTA}
          accessibilityState={{ disabled: posting, busy: posting }}
          onPress={() => void post()}
        >
          <Text style={styles.ctaInk}>{DIARY_POST_CTA}</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}


function DayCard({
  draft,
  ordinal,
  onChange,
  onLeave,
}: {
  readonly draft: DayDraft;
  readonly ordinal: number;
  readonly onChange: (next: DayDraft) => void;
  readonly onLeave: () => void;
}) {
  const full = draft.photos.length >= memoryMetrics.photosPerPostcard;

  return (
    <View style={styles.card}>
      <Text style={styles.dayHeading}>{dayHeading(ordinal, draft.date)}</Text>

      <Text style={styles.label}>{DAY_PLACE_LABEL}</Text>
      <TextInput
        style={styles.input}
        value={draft.place}
        onChangeText={(place) => onChange({ ...draft, place })}
        onBlur={onLeave}
        placeholder={DAY_PLACE_PLACEHOLDER}
        placeholderTextColor={memoryColors.faint}
        accessibilityLabel={`${DAY_PLACE_LABEL} ${ordinal}`}
      />

      <View style={styles.photosHeader}>
        <Text style={styles.label}>{DAY_PHOTOS_LABEL}</Text>
        <Text style={styles.count}>
          {photoCountLabel(draft.photos.length, memoryMetrics.photosPerPostcard)}
        </Text>
      </View>

      <View style={styles.tiles}>
        {draft.photos.map((photo, index) => (
          <Pressable
            key={photo.uri}
            style={styles.tile}
            accessibilityRole="button"
            accessibilityLabel={`Remove photo ${index + 1}`}
            onPress={() => onChange(withoutPhotoAt(draft, index))}
          >
            <MediaThumb
              url={null}
              localPreview={photo.uri}
              style={styles.tilePhoto}
              accessibilityLabel={`Photo ${index + 1}`}
            />
          </Pressable>
        ))}

        {!full && (
          <AddTile
            label={`${DAY_ADD_PHOTO} ${ordinal}`}
            onPress={() => {
              void pickPhotos(memoryMetrics.photosPerPostcard - draft.photos.length).then(
                (picked) => {
                  if (picked.length > 0) {
                    onChange(withPhotos(draft, picked, memoryMetrics.photosPerPostcard));
                  }
                },
              );
            }}
          />
        )}
      </View>

      <Text style={styles.label}>{DAY_CAPTION_LABEL}</Text>
      <TextInput
        style={StyleSheet.flatten([styles.input, styles.area])}
        value={draft.caption}
        onChangeText={(caption) => onChange({ ...draft, caption })}
        onBlur={onLeave}
        multiline
        accessibilityLabel={`${DAY_CAPTION_LABEL} ${ordinal}`}
      />
    </View>
  );
}


function AddTile({ label, onPress }: { readonly label: string; readonly onPress: () => void }) {
  const press = usePressFeedback();

  return (
    <AnimatedPressable
      style={StyleSheet.flatten([styles.tile, styles.addTile, press.style])}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <Text style={styles.addTileInk}>{DAY_ADD_PHOTO}</Text>
    </AnimatedPressable>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: memoryColors.screen,
  },
  body: {
    padding: memoryMetrics.screenPadding,
    gap: memoryMetrics.dayGap,
  },
  badge: {
    ...memoryTypography.badge,
    color: memoryColors.accent,
  },
  heading: {
    ...memoryTypography.heading,
    color: memoryColors.title,
  },
  subtitle: {
    ...memoryTypography.subtitle,
    color: memoryColors.muted,
  },
  card: {
    backgroundColor: memoryColors.card,
    borderWidth: 1,
    borderColor: memoryColors.hairline,
    borderRadius: memoryMetrics.cardRadius,
    padding: memoryMetrics.cardPadding,
    gap: 6,
  },
  dayHeading: {
    ...memoryTypography.dayHeading,
    color: memoryColors.title,
    marginBottom: 4,
  },
  label: {
    ...memoryTypography.label,
    color: memoryColors.body,
  },
  input: {
    ...memoryTypography.input,
    minHeight: memoryMetrics.fieldHeight,
    borderWidth: 1,
    borderColor: memoryColors.hairline,
    borderRadius: memoryMetrics.fieldRadius,
    paddingHorizontal: 12,
    backgroundColor: memoryColors.card,
    color: memoryColors.title,
  },
  area: {
    minHeight: memoryMetrics.fieldHeight * 2,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  photosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  count: {
    ...memoryTypography.small,
    color: memoryColors.muted,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: memoryMetrics.tileGap,
  },
  tile: {
    width: memoryMetrics.tileSize,
    height: memoryMetrics.tileSize,
    borderRadius: memoryMetrics.tileRadius,
    overflow: 'hidden',
    backgroundColor: memoryColors.tileWell,
  },
  tilePhoto: {
    width: '100%',
    height: '100%',
  },
  addTile: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: memoryColors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTileInk: {
    ...memoryTypography.small,
    color: memoryColors.muted,
    textAlign: 'center',
  },
  hint: {
    ...memoryTypography.meta,
    color: memoryColors.muted,
    textAlign: 'center',
  },
  rail: {
    padding: memoryMetrics.screenPadding,
    borderTopWidth: 1,
    borderTopColor: memoryColors.hairline,
    backgroundColor: memoryColors.card,
  },
  cta: {
    height: memoryMetrics.ctaHeight,
    borderRadius: memoryMetrics.ctaRadius,
    backgroundColor: memoryColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaInk: {
    ...memoryTypography.cta,
    color: memoryColors.card,
  },
});
