import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useExitGuard } from '../navigation/useExitGuard';
import { pickPhotos } from '../media/pickPhoto';
import { memoryRepository } from '../repositories/memoryRepository';
import { memoryColors, memoryMetrics, memoryTypography } from '../theme/memoryTokens';
import { DayCard } from './DayCard';
import {
  draftsFor,
  isWorthSaving,
  replacedAt,
  unsavedAmong,
  withPhotos,
  withoutPhotoAt,
  type DayDraft,
} from './diaryDayDraft';
import { askMemoryConfirmation } from './MemoryConfirm';
import { MemoryCta } from './MemoryCta';
import { MemoryHeader } from './MemoryHeader';
import {
  DIARY_DAYS_HINT,
  DIARY_DAYS_SUBTITLE,
  DISCARD_ACTION,
  DISCARD_DIARY_TITLE,
  KEEP_EDITING_ACTION,
  POST_CTA,
  dayHeading,
  discardDiaryBody,
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
    askMemoryConfirmation(
      {
        title: DISCARD_DIARY_TITLE,
        body: discardDiaryBody(title),
        confirmLabel: DISCARD_ACTION,
        cancelLabel: KEEP_EDITING_ACTION,
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
      <MemoryHeader pill="DIARY" title={title} subtitle={DIARY_DAYS_SUBTITLE} />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {drafts.map((draft, index) => (
          <DayCard
            key={draft.date}
            heading={dayHeading(index + 1, draft.date)}
            ordinal={index + 1}
            place={draft.place}
            caption={draft.caption}
            photos={draft.photos}
            editable={!posting}
            onPlace={(place) => setDrafts((current) => replacedAt(current, index, { ...draft, place }))}
            onCaption={(caption) =>
              setDrafts((current) => replacedAt(current, index, { ...draft, caption }))
            }
            onAddPhotos={() => {
              void pickPhotos(memoryMetrics.photosPerPostcard - draft.photos.length).then(
                (picked) => {
                  if (picked.length > 0) {
                    setDrafts((current) =>
                      replacedAt(
                        current,
                        index,
                        withPhotos(draft, picked, memoryMetrics.photosPerPostcard),
                      ),
                    );
                  }
                },
              );
            }}
            onRemovePhoto={(at) =>
              setDrafts((current) => replacedAt(current, index, withoutPhotoAt(draft, at)))
            }
            onLeave={() => void saveDay(index)}
          />
        ))}
      </ScrollView>

      <View style={styles.rail}>
        <Text style={styles.hint}>{DIARY_DAYS_HINT}</Text>
        <MemoryCta label={POST_CTA} busy={posting} onPress={() => void post()} />
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: memoryColors.screen,
  },
  body: {
    paddingHorizontal: memoryMetrics.screenPadding,
    paddingTop: 14,
    paddingBottom: 24,
    gap: memoryMetrics.cardGap,
  },
  rail: {
    paddingTop: 8,
    paddingBottom: 16,
    gap: 10,
    backgroundColor: memoryColors.screen,
  },
  hint: {
    ...memoryTypography.meta13,
    color: memoryColors.muted,
    textAlign: 'center',
  },
});
