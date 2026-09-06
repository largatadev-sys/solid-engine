import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import { askForConfirmation } from '../components/ConfirmStation';
import { useExitGuard } from '../navigation/useExitGuard';
import { MediaThumb } from '../media/MediaThumb';
import { pickPhoto } from '../media/pickPhoto';
import type { PickedPhoto } from '../media/pickedPhoto';
import { memoryRepository } from '../repositories/memoryRepository';
import { memoryColors, memoryMetrics, memoryTypography } from '../theme/memoryTokens';
import { DateRangeSheet } from './DateRangeSheet';
import { isComplete, type DateRange } from './dateRange';
import type { DiaryResponse } from '../types/api';
import {
  CANCEL_ACTION,
  DISCARD_ACTION,
  DISCARD_CHANGES_TITLE,
  DIARY_COVER_EMPTY,
  DIARY_COVER_LABEL,
  DIARY_CREATE_FAILED,
  DIARY_DESTINATION_LABEL,
  DIARY_DESTINATION_PLACEHOLDER,
  DIARY_END_LABEL,
  DIARY_START_LABEL,
  DIARY_TITLE_LABEL,
  DIARY_WHEN_LABEL,
  EDIT_DIARY_DATES_HINT,
  EDIT_DIARY_TITLE,
  SAVE_CTA,
  shortDate,
} from './memoryCopy';


interface EditDiaryScreenProps {
  readonly diary: DiaryResponse;
  readonly onSaved: (diary: DiaryResponse) => void;
}


export function EditDiaryScreen({ diary, onSaved }: EditDiaryScreenProps) {
  const [title, setTitle] = useState(diary.title);
  const [destination, setDestination] = useState(diary.destination ?? '');
  const [range, setRange] = useState<DateRange>({
    start: diary.startDate,
    end: diary.endDate,
  });
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
    askForConfirmation(
      {
        title: DISCARD_CHANGES_TITLE,
        body: '',
        confirmLabel: DISCARD_ACTION,
        cancelLabel: CANCEL_ACTION,
        tone: 'destructive',
      },
      proceed,
    );
  });

  const ready = title.trim() !== '' && isComplete(range);

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
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>{EDIT_DIARY_TITLE}</Text>

        <Text style={styles.label}>{DIARY_TITLE_LABEL}</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          editable={!saving}
          accessibilityLabel={DIARY_TITLE_LABEL}
        />

        <Text style={styles.label}>{DIARY_DESTINATION_LABEL}</Text>
        <TextInput
          style={styles.input}
          value={destination}
          onChangeText={setDestination}
          editable={!saving}
          placeholder={DIARY_DESTINATION_PLACEHOLDER}
          placeholderTextColor={memoryColors.faint}
          accessibilityLabel={DIARY_DESTINATION_LABEL}
        />

        <Text style={styles.label}>{DIARY_COVER_LABEL}</Text>
        <Pressable
          style={styles.cover}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={DIARY_COVER_LABEL}
          onPress={() => {
            void pickPhoto().then((picked) => {
              if (picked !== null) setCover(picked);
            });
          }}
        >
          {cover === null && diary.cover === null ? (
            <Text style={styles.coverEmpty}>{DIARY_COVER_EMPTY}</Text>
          ) : (
            <MediaThumb
              url={cover === null ? diary.cover?.url ?? null : null}
              localPreview={cover?.uri ?? null}
              style={styles.coverPhoto}
              accessibilityLabel={DIARY_COVER_LABEL}
            />
          )}
        </Pressable>

        <Text style={styles.label}>{DIARY_WHEN_LABEL}</Text>
        <View style={styles.dates}>
          <DateChip
            label={DIARY_START_LABEL}
            value={range.start === null ? DIARY_START_LABEL : shortDate(range.start)}
            onPress={() => setCalendarOpen(true)}
          />
          <DateChip
            label={DIARY_END_LABEL}
            value={range.end === null ? DIARY_END_LABEL : shortDate(range.end)}
            onPress={() => setCalendarOpen(true)}
          />
        </View>
        <Text style={styles.hint}>{EDIT_DIARY_DATES_HINT}</Text>

        {failed && <Text style={styles.failed}>{DIARY_CREATE_FAILED}</Text>}
      </ScrollView>

      <View style={styles.rail}>
        <AnimatedPressable
          style={StyleSheet.flatten([styles.cta, ready && !saving ? null : styles.ctaDisabled])}
          disabled={!ready || saving}
          accessibilityRole="button"
          accessibilityLabel={SAVE_CTA}
          accessibilityState={{ disabled: !ready || saving, busy: saving }}
          onPress={() => void save()}
        >
          <Text style={[styles.ctaInk, ready && !saving ? null : styles.ctaInkDisabled]}>
            {SAVE_CTA}
          </Text>
        </AnimatedPressable>
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


function DateChip({
  label,
  value,
  onPress,
}: {
  readonly label: string;
  readonly value: string;
  readonly onPress: () => void;
}) {
  const press = usePressFeedback();

  return (
    <AnimatedPressable
      style={StyleSheet.flatten([styles.dateChip, press.style])}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <Text style={styles.dateChipInk}>{value}</Text>
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
    gap: 6,
  },
  heading: {
    ...memoryTypography.heading,
    color: memoryColors.title,
    marginBottom: 6,
  },
  label: {
    ...memoryTypography.label,
    color: memoryColors.body,
    marginTop: 6,
  },
  input: {
    ...memoryTypography.input,
    height: memoryMetrics.fieldHeight,
    borderWidth: 1,
    borderColor: memoryColors.hairline,
    borderRadius: memoryMetrics.fieldRadius,
    paddingHorizontal: 12,
    backgroundColor: memoryColors.card,
    color: memoryColors.title,
  },
  cover: {
    height: memoryMetrics.coverHeight,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: memoryColors.hairline,
    borderRadius: memoryMetrics.fieldRadius,
    backgroundColor: memoryColors.tileWell,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coverEmpty: {
    ...memoryTypography.body,
    color: memoryColors.muted,
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
  },
  dates: {
    flexDirection: 'row',
    gap: memoryMetrics.tileGap,
  },
  dateChip: {
    flex: 1,
    height: memoryMetrics.fieldHeight,
    borderWidth: 1,
    borderColor: memoryColors.hairline,
    borderRadius: memoryMetrics.fieldRadius,
    backgroundColor: memoryColors.card,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  dateChipInk: {
    ...memoryTypography.input,
    color: memoryColors.title,
  },
  hint: {
    ...memoryTypography.small,
    color: memoryColors.muted,
    marginTop: 4,
  },
  failed: {
    ...memoryTypography.meta,
    color: memoryColors.danger,
    marginTop: 8,
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
  ctaDisabled: {
    backgroundColor: memoryColors.disabledWell,
  },
  ctaInk: {
    ...memoryTypography.cta,
    color: memoryColors.card,
  },
  ctaInkDisabled: {
    color: memoryColors.disabledInk,
  },
});
