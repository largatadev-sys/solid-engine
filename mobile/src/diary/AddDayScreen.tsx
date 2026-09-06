import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import { ApiError } from '../api/ApiError';
import { memoryRepository } from '../repositories/memoryRepository';
import { memoryColors, memoryMetrics, memoryTypography } from '../theme/memoryTokens';
import { DateRangeSheet } from './DateRangeSheet';
import type { DateRange } from './dateRange';
import type { DiaryDayResponse } from '../types/api';
import {
  ADD_A_DAY_TITLE,
  DAY_PLACE_LABEL,
  DAY_PLACE_PLACEHOLDER,
  DIARY_CREATE_FAILED,
  SAVE_CTA,
  dayOrdinalLabel,
  shortDate,
} from './memoryCopy';


interface AddDayScreenProps {
  readonly diaryId: string;
  readonly nextOrdinal: number;
  readonly defaultDate: string;
  readonly onAdded: (day: DiaryDayResponse) => void;
}


export function AddDayScreen({
  diaryId,
  nextOrdinal,
  defaultDate,
  onAdded,
}: AddDayScreenProps) {
  const [range, setRange] = useState<DateRange>({ start: defaultDate, end: defaultDate });
  const [place, setPlace] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  async function add(): Promise<void> {
    if (range.start === null) return;

    setSaving(true);
    setRefusal(null);
    try {
      onAdded(
        await memoryRepository.addDay(diaryId, {
          date: range.start,
          place: place.trim() === '' ? null : place.trim(),
        }),
      );
    } catch (refused) {
      setRefusal(refused instanceof ApiError ? refused.message : DIARY_CREATE_FAILED);
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>{ADD_A_DAY_TITLE}</Text>
        <Text style={styles.ordinal}>{dayOrdinalLabel(nextOrdinal)}</Text>

        <AnimatedPressable
          style={styles.dateChip}
          accessibilityRole="button"
          accessibilityLabel={ADD_A_DAY_TITLE}
          onPress={() => setCalendarOpen(true)}
        >
          <Text style={styles.dateChipInk}>
            {range.start === null ? defaultDate : shortDate(range.start)}
          </Text>
        </AnimatedPressable>

        <Text style={styles.label}>{DAY_PLACE_LABEL}</Text>
        <TextInput
          style={styles.input}
          value={place}
          onChangeText={setPlace}
          editable={!saving}
          placeholder={DAY_PLACE_PLACEHOLDER}
          placeholderTextColor={memoryColors.faint}
          accessibilityLabel={DAY_PLACE_LABEL}
        />

        {refusal !== null && <Text style={styles.failed}>{refusal}</Text>}
      </ScrollView>

      <View style={styles.rail}>
        <SaveButton disabled={range.start === null || saving} onPress={() => void add()} />
      </View>

      <DateRangeSheet
        open={calendarOpen}
        range={range}
        mode="single"
        title={ADD_A_DAY_TITLE}
        onDone={(picked) => {
          setRange(picked);
          setCalendarOpen(false);
        }}
        onDismiss={() => setCalendarOpen(false)}
      />
    </View>
  );
}


function SaveButton({
  disabled,
  onPress,
}: {
  readonly disabled: boolean;
  readonly onPress: () => void;
}) {
  const press = usePressFeedback();

  return (
    <AnimatedPressable
      style={StyleSheet.flatten([styles.cta, disabled ? styles.ctaDisabled : press.style])}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={SAVE_CTA}
      accessibilityState={{ disabled }}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <Text style={[styles.ctaInk, disabled ? styles.ctaInkDisabled : null]}>{SAVE_CTA}</Text>
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
  },
  ordinal: {
    ...memoryTypography.small,
    color: memoryColors.muted,
    marginBottom: 6,
  },
  dateChip: {
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
