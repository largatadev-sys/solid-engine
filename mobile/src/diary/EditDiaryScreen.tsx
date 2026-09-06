import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useExitGuard } from '../navigation/useExitGuard';
import { MediaThumb } from '../media/MediaThumb';
import { pickPhoto } from '../media/pickPhoto';
import type { PickedPhoto } from '../media/pickedPhoto';
import { memoryRepository } from '../repositories/memoryRepository';
import { memoryColors, memoryMetrics, memoryMotion, memoryTypography } from '../theme/memoryTokens';
import { DateChips } from './DateChips';
import { DateRangeSheet } from './DateRangeSheet';
import { isComplete, type DateRange } from './dateRange';
import type { DiaryResponse } from '../types/api';
import { askMemoryConfirmation } from './MemoryConfirm';
import { MemoryCta } from './MemoryCta';
import { MemoryField } from './MemoryField';
import { MemoryHeader } from './MemoryHeader';
import { MemoryIcon } from './MemoryIcon';
import {
  DISCARD_ACTION,
  DISCARD_CHANGES_BODY,
  DISCARD_CHANGES_TITLE,
  DIARY_COVER_CHANGE,
  DIARY_COVER_EMPTY,
  DIARY_COVER_LABEL,
  DIARY_DESTINATION_LABEL,
  DIARY_DESTINATION_PLACEHOLDER,
  DIARY_TITLE_LABEL,
  EDIT_DIARY_DATES_HINT,
  EDIT_DIARY_TITLE,
  KEEP_EDITING_ACTION,
  SAVE_CTA,
  SAVE_FAILED,
} from './memoryCopy';


interface EditDiaryScreenProps {
  readonly diary: DiaryResponse;
  readonly onSaved: (diary: DiaryResponse) => void;
}


export function EditDiaryScreen({ diary, onSaved }: EditDiaryScreenProps) {
  const [title, setTitle] = useState(diary.title);
  const [destination, setDestination] = useState(diary.destination ?? '');
  const [range, setRange] = useState<DateRange>({ start: diary.startDate, end: diary.endDate });
  const [cover, setCover] = useState<PickedPhoto | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty =
    !saved &&
    (title !== diary.title ||
      destination !== (diary.destination ?? '') ||
      range.start !== diary.startDate ||
      range.end !== diary.endDate ||
      cover !== null);

  useExitGuard(dirty, (proceed) => {
    askMemoryConfirmation(
      {
        title: DISCARD_CHANGES_TITLE,
        body: DISCARD_CHANGES_BODY,
        confirmLabel: DISCARD_ACTION,
        cancelLabel: KEEP_EDITING_ACTION,
      },
      proceed,
    );
  });

  const ready = title.trim() !== '' && isComplete(range);
  const shownCover = cover !== null || diary.cover !== null;

  async function save(): Promise<void> {
    if (!ready || range.start === null || range.end === null) return;

    setSaving(true);
    setFailed(false);
    try {
      let next = await memoryRepository.describeDiary(diary.id, {
        title: title.trim(),
        destination: destination.trim() === '' ? null : destination.trim(),
        startDate: range.start,
        endDate: range.end,
      });
      if (cover !== null) next = await memoryRepository.setCover(diary.id, cover);

      setSaved(true);
      onSaved(next);
    } catch {
      setFailed(true);
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <MemoryHeader pill="DIARY" title={EDIT_DIARY_TITLE} />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <MemoryField
          label={DIARY_TITLE_LABEL}
          required
          value={title}
          onChangeText={setTitle}
          editable={!saving}
        />

        <MemoryField
          label={DIARY_DESTINATION_LABEL}
          value={destination}
          onChangeText={setDestination}
          editable={!saving}
          placeholder={DIARY_DESTINATION_PLACEHOLDER}
        />

        <View style={styles.field}>
          <Text style={styles.label}>{DIARY_COVER_LABEL}</Text>
          <Pressable
            style={({ pressed }) =>
              StyleSheet.flatten([
                styles.cover,
                shownCover ? styles.coverFilled : null,
                pressed ? styles.pressed : null,
              ])
            }
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel={shownCover ? DIARY_COVER_CHANGE : DIARY_COVER_EMPTY}
            onPress={() => {
              void pickPhoto().then((picked) => {
                if (picked !== null) setCover(picked);
              });
            }}
          >
            {shownCover ? (
              <>
                <MediaThumb
                  url={cover === null ? (diary.cover?.url ?? null) : null}
                  full
                  localPreview={cover?.uri ?? null}
                  style={styles.coverPhoto}
                  accessibilityLabel={DIARY_COVER_LABEL}
                />
                <View style={styles.changePill}>
                  <Text style={styles.changeInk}>{DIARY_COVER_CHANGE}</Text>
                </View>
              </>
            ) : (
              <>
                <MemoryIcon name="image" size={22} color={memoryColors.muted} />
                <Text style={styles.coverEmpty}>{DIARY_COVER_EMPTY}</Text>
              </>
            )}
          </Pressable>
        </View>

        <DateChips range={range} onPress={() => setCalendarOpen(true)} />
        <Text style={styles.hint}>{EDIT_DIARY_DATES_HINT}</Text>
      </ScrollView>

      <View style={styles.rail}>
        <MemoryCta label={SAVE_CTA} disabled={!ready} busy={saving} onPress={() => void save()} />
        {failed && <Text style={styles.failed}>{SAVE_FAILED}</Text>}
      </View>

      <DateRangeSheet
        open={calendarOpen}
        range={range}
        onDone={(picked) => {
          setRange(picked);
          setCalendarOpen(false);
        }}
        onDismiss={() => setCalendarOpen(false)}
      />
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
    gap: 14,
  },
  field: {
    gap: 6,
  },
  label: {
    ...memoryTypography.fieldLabel,
    color: memoryColors.label,
  },
  cover: {
    height: memoryMetrics.coverHeight,
    borderWidth: memoryMetrics.dashedWidth,
    borderStyle: 'dashed',
    borderColor: memoryColors.dashed,
    borderRadius: memoryMetrics.coverRadius,
    backgroundColor: memoryColors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  coverFilled: {
    borderWidth: 0,
  },
  coverEmpty: {
    ...memoryTypography.input,
    color: memoryColors.muted,
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
  },
  changePill: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: memoryColors.changePill,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  changeInk: {
    ...memoryTypography.cardMetaStrong,
    color: memoryColors.white,
  },
  hint: {
    ...memoryTypography.meta13,
    color: memoryColors.muted,
    marginTop: -6,
  },
  rail: {
    paddingTop: 8,
    paddingBottom: 16,
    gap: 8,
    backgroundColor: memoryColors.screen,
  },
  failed: {
    ...memoryTypography.meta13,
    color: memoryColors.danger,
    paddingHorizontal: memoryMetrics.screenPadding,
  },
  pressed: {
    opacity: memoryMotion.pressOpacity,
  },
});
