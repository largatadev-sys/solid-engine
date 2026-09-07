import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExitGuard } from '../navigation/useExitGuard';
import { pickPhotos } from '../media/pickPhoto';
import { memoryRepository } from '../repositories/memoryRepository';
import { memoryColors, memoryMetrics, memoryTypography } from '../theme/memoryTokens';
import { DayCard } from './DayCard';
import {
  draftsFor,
  isWorthSaving,
  unsavedAmong,
  updatedAt,
  withPhotos,
  withoutPhotoAt,
  type DayDraft,
} from './diaryDayDraft';
import { askMemoryConfirmation } from './MemoryConfirm';
import { MemoryCta } from './MemoryCta';
import { MemoryHeader } from './MemoryHeader';
import { showMemoryToast } from './MemoryToast';
import {
  DIARY_DAYS_HINT,
  DIARY_DAYS_SUBTITLE,
  DIARY_POST_FAILED,
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
  const insets = useSafeAreaInsets();
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

  const latest = useRef(drafts);
  latest.current = drafts;
  const inFlight = useRef(new Map<string, Promise<void>>());
  const stored = useRef(new Set<string>());

  function saveDay(index: number): Promise<void> {
    const draft = latest.current[index];
    if (
      draft === undefined
      || !isWorthSaving(draft)
      || draft.savedDayId !== null
      || stored.current.has(draft.date)
    ) {
      return Promise.resolve();
    }
    const running = inFlight.current.get(draft.date);
    if (running !== undefined) return running;

    const save = (async () => {
      const day = await memoryRepository.addDay(diaryId, {
        date: draft.date,
        place: draft.place.trim() === '' ? null : draft.place.trim(),
        pin: draft.pin,
      });
      stored.current.add(draft.date);
      const filled = latest.current[index] ?? draft;
      try {
        await memoryRepository.postOnDay(
          diaryId,
          day.id,
          {
            caption: filled.caption.trim() === '' ? null : filled.caption.trim(),
            place: null,
            pin: null,
          },
          filled.photos,
        );
      } catch (failure) {
        stored.current.delete(draft.date);
        await memoryRepository.deleteDay(diaryId, day.id).catch(() => undefined);
        throw failure;
      }
      setDrafts((current) => updatedAt(current, index, (d) => ({ ...d, savedDayId: day.id })));
    })().finally(() => inFlight.current.delete(draft.date));
    inFlight.current.set(draft.date, save);
    return save;
  }

  function leaveDay(index: number): void {
    void saveDay(index).catch(() => showMemoryToast(DIARY_POST_FAILED, 'failure'));
  }

  async function post(): Promise<void> {
    setPosting(true);
    try {
      await Promise.all(inFlight.current.values());
      for (const draft of unsavedAmong(latest.current)) {
        await saveDay(latest.current.indexOf(draft));
      }
      setPosted(true);
      onPosted();
    } catch {
      showMemoryToast(DIARY_POST_FAILED, 'failure');
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
            pin={draft.pin}
            caption={draft.caption}
            photos={draft.photos}
            editable={!posting}
            onPlace={(place, pin) =>
              setDrafts((current) => updatedAt(current, index, (d) => ({ ...d, place, pin })))
            }
            onCaption={(caption) =>
              setDrafts((current) => updatedAt(current, index, (d) => ({ ...d, caption })))
            }
            onAddPhotos={() => {
              void pickPhotos(memoryMetrics.photosPerPostcard - draft.photos.length).then(
                (picked) => {
                  if (picked.length > 0) {
                    setDrafts((current) =>
                      updatedAt(current, index, (d) =>
                        withPhotos(d, picked, memoryMetrics.photosPerPostcard),
                      ),
                    );
                  }
                },
              );
            }}
            onRemovePhoto={(at) =>
              setDrafts((current) => updatedAt(current, index, (d) => withoutPhotoAt(d, at)))
            }
            onLeave={() => leaveDay(index)}
          />
        ))}
      </ScrollView>

      <View style={[styles.rail, { paddingBottom: insets.bottom + memoryMetrics.railFloor }]}>
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
