import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../api/ApiError';
import type { Pin } from '../maps/pinRules';
import { memoryRepository } from '../repositories/memoryRepository';
import { memoryColors, memoryMetrics, memoryMotion, memoryTypography } from '../theme/memoryTokens';
import { DateRangeSheet } from './DateRangeSheet';
import type { DateRange } from './dateRange';
import type { DiaryDayResponse } from '../types/api';
import { MemoryCta } from './MemoryCta';
import { MemoryField } from './MemoryField';
import { MemoryPlaceField } from './MemoryPlaceField';
import { MemoryHeader } from './MemoryHeader';
import { MemoryIcon } from './MemoryIcon';
import {
  ADD_DAY_CTA,
  DAY_DATE_LABEL,
  DAY_PLACE_LABEL,
  DAY_PLACE_PLACEHOLDER,
  DIARY_CREATE_FAILED,
  addDaySubtitle,
  dayOrdinalLabel,
  shortDate,
} from './memoryCopy';


interface AddDayScreenProps {
  readonly diaryId: string;
  readonly diaryTitle: string;
  readonly nextOrdinal: number;
  readonly lastDay: { readonly ordinal: number; readonly date: string } | null;
  readonly defaultDate: string;
  readonly onAdded: (day: DiaryDayResponse) => void;
}


export function AddDayScreen({
  diaryId,
  diaryTitle,
  nextOrdinal,
  lastDay,
  defaultDate,
  onAdded,
}: AddDayScreenProps) {
  const [range, setRange] = useState<DateRange>({ start: defaultDate, end: defaultDate });
  const [place, setPlace] = useState('');
  const [pin, setPin] = useState<Pin | null>(null);
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
        pin,
        }),
      );
    } catch (refused) {
      setRefusal(refused instanceof ApiError ? refused.message : DIARY_CREATE_FAILED);
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <MemoryHeader
        pill="DIARY"
        title={dayOrdinalLabel(nextOrdinal)}
        subtitle={
          lastDay === null ? diaryTitle : addDaySubtitle(diaryTitle, lastDay.ordinal, lastDay.date)
        }
      />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>
            {DAY_DATE_LABEL}
            <Text style={styles.required}>*</Text>
          </Text>
          <Pressable
            style={({ pressed }) =>
              StyleSheet.flatten([styles.dateField, pressed ? styles.pressed : null])
            }
            accessibilityRole="button"
            accessibilityLabel={DAY_DATE_LABEL}
            onPress={() => setCalendarOpen(true)}
          >
            <MemoryIcon name="calendar" size={16} color={memoryColors.muted} />
            <Text style={styles.dateValue}>
              {range.start === null ? shortDate(defaultDate) : shortDate(range.start)}
            </Text>
          </Pressable>
        </View>

        <MemoryPlaceField
          label={DAY_PLACE_LABEL}
          glyph
          value={place}
          pin={pin}
          openNear={pin}
          editable={!saving}
          placeholder={DAY_PLACE_PLACEHOLDER}
          onPicked={(picked, droppedPin) => {
            setPlace(picked);
            setPin(droppedPin);
          }}
        />
      </ScrollView>

      <View style={styles.rail}>
        <MemoryCta
          label={ADD_DAY_CTA}
          disabled={range.start === null}
          busy={saving}
          onPress={() => void add()}
        />
        {refusal !== null && <Text style={styles.failed}>{refusal}</Text>}
      </View>

      <DateRangeSheet
        open={calendarOpen}
        range={range}
        mode="single"
        title={DAY_DATE_LABEL}
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
  required: {
    color: memoryColors.accent,
  },
  dateField: {
    height: memoryMetrics.fieldHeight,
    borderWidth: 1,
    borderColor: memoryColors.hairline,
    borderRadius: memoryMetrics.fieldRadius,
    paddingHorizontal: memoryMetrics.fieldPaddingH,
    backgroundColor: memoryColors.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateValue: {
    ...memoryTypography.input,
    color: memoryColors.title,
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
