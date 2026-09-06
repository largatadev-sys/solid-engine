import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../members/BottomSheet';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import { memoryColors, memoryMetrics, memoryTypography } from '../theme/memoryTokens';
import {
  CALENDAR_DONE,
  DIARY_END_LABEL,
  DIARY_END_PLACEHOLDER,
  DIARY_START_LABEL,
  DIARY_WHEN_LABEL,
  rangeSummary,
  shortDate,
} from './memoryCopy';
import {
  dayCountOf,
  emptyRange,
  isComplete,
  isEdgeOf,
  isInTheFuture,
  isWithin,
  monthGridOf,
  tapped,
  todayIso,
  type DateRange,
  type RangeMode,
} from './dateRange';


const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;


interface DateRangeSheetProps {
  readonly open: boolean;
  readonly range: DateRange;
  readonly mode?: RangeMode;
  readonly title?: string;
  readonly onDone: (range: DateRange) => void;
  readonly onDismiss: () => void;
}


export function DateRangeSheet({
  open,
  range,
  mode = 'range',
  title = DIARY_WHEN_LABEL,
  onDone,
  onDismiss,
}: DateRangeSheetProps) {
  const [draft, setDraft] = useState<DateRange>(range);
  const [shown, setShown] = useState(() => monthOf(range.start ?? todayIso()));
  const today = todayIso();

  const grid = monthGridOf(shown.year, shown.monthIndex);
  const ready = mode === 'single' ? draft.start !== null : isComplete(draft);

  return (
    <BottomSheet open={open} title={title} onDismiss={onDismiss}>
      {mode === 'range' && (
        <View style={styles.chips}>
          <Chip
            label={DIARY_START_LABEL}
            value={draft.start === null ? DIARY_START_LABEL : shortDate(draft.start)}
            active={draft.start === null || draft.end !== null}
          />
          <Chip
            label={DIARY_END_LABEL}
            value={draft.end === null ? DIARY_END_PLACEHOLDER : shortDate(draft.end)}
            active={draft.start !== null && draft.end === null}
          />
        </View>
      )}

      <View style={styles.monthRow}>
        <MonthStep label="‹" onPress={() => setShown(steppedBy(shown, -1))} />
        <Text style={styles.monthName}>
          {MONTH_NAMES[shown.monthIndex]} {shown.year}
        </Text>
        <MonthStep label="›" onPress={() => setShown(steppedBy(shown, 1))} />
      </View>

      <View style={styles.weekdays}>
        {WEEKDAYS.map((weekday, index) => (
          <Text key={`${weekday}${index}`} style={styles.weekday}>
            {weekday}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {grid.map((day, index) => (
          <DayCell
            key={day ?? `pad${index}`}
            day={day}
            range={draft}
            today={today}
            onPress={(picked) => setDraft(tapped(draft, picked, mode))}
          />
        ))}
      </View>

      <Text style={styles.summary}>
        {mode === 'single'
          ? draft.start === null
            ? ''
            : shortDate(draft.start)
          : ready
            ? rangeSummary(dayCountOf(draft))
            : ''}
      </Text>

      <AnimatedPressable
        style={StyleSheet.flatten([styles.done, ready ? null : styles.doneDisabled])}
        disabled={!ready}
        accessibilityRole="button"
        accessibilityLabel={CALENDAR_DONE}
        onPress={() => onDone(mode === 'single' ? { start: draft.start, end: draft.start } : draft)}
      >
        <Text style={[styles.doneInk, ready ? null : styles.doneInkDisabled]}>{CALENDAR_DONE}</Text>
      </AnimatedPressable>
    </BottomSheet>
  );
}


function DayCell({
  day,
  range,
  today,
  onPress,
}: {
  readonly day: string | null;
  readonly range: DateRange;
  readonly today: string;
  readonly onPress: (day: string) => void;
}) {
  if (day === null) {
    return <View style={styles.cell} />;
  }

  const disabled = isInTheFuture(day, today);
  const edge = isEdgeOf(range, day);
  const within = isWithin(range, day);

  return (
    <Pressable
      style={StyleSheet.flatten([
        styles.cell,
        within && !edge ? styles.cellWithin : null,
        edge ? styles.cellEdge : null,
      ])}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: edge }}
      accessibilityLabel={shortDate(day)}
      onPress={() => onPress(day)}
    >
      <Text
        style={[
          styles.cellInk,
          disabled ? styles.cellInkDisabled : null,
          edge ? styles.cellInkEdge : null,
        ]}
      >
        {Number(day.slice(8))}
      </Text>
    </Pressable>
  );
}


function Chip({
  label,
  value,
  active,
}: {
  readonly label: string;
  readonly value: string;
  readonly active: boolean;
}) {
  return (
    <View style={StyleSheet.flatten([styles.chip, active ? styles.chipActive : null])}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue}>{value}</Text>
    </View>
  );
}


function MonthStep({ label, onPress }: { readonly label: string; readonly onPress: () => void }) {
  const press = usePressFeedback();

  return (
    <AnimatedPressable
      style={StyleSheet.flatten([styles.monthStep, press.style])}
      accessibilityRole="button"
      accessibilityLabel={label === '‹' ? 'Previous month' : 'Next month'}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <Text style={styles.monthStepInk}>{label}</Text>
    </AnimatedPressable>
  );
}


function monthOf(iso: string): { year: number; monthIndex: number } {
  return { year: Number(iso.slice(0, 4)), monthIndex: Number(iso.slice(5, 7)) - 1 };
}


function steppedBy(
  shown: { year: number; monthIndex: number },
  by: number,
): { year: number; monthIndex: number } {
  const moved = shown.monthIndex + by;
  if (moved < 0) return { year: shown.year - 1, monthIndex: 11 };
  if (moved > 11) return { year: shown.year + 1, monthIndex: 0 };
  return { year: shown.year, monthIndex: moved };
}


export { emptyRange };


const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    gap: memoryMetrics.tileGap,
    marginBottom: memoryMetrics.dayGap,
  },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderColor: memoryColors.hairline,
    borderRadius: memoryMetrics.fieldRadius,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chipActive: {
    borderColor: memoryColors.accent,
  },
  chipLabel: {
    ...memoryTypography.tiny,
    color: memoryColors.muted,
  },
  chipValue: {
    ...memoryTypography.cell,
    color: memoryColors.title,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  monthName: {
    ...memoryTypography.monthName,
    color: memoryColors.title,
  },
  monthStep: {
    width: memoryMetrics.chevron + 12,
    height: memoryMetrics.chevron + 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthStepInk: {
    ...memoryTypography.chevron,
    color: memoryColors.body,
  },
  weekdays: {
    flexDirection: 'row',
  },
  weekday: {
    flexBasis: '14.2857%',
    textAlign: 'center',
    ...memoryTypography.tiny,
    color: memoryColors.faint,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    flexBasis: '14.2857%',
    height: memoryMetrics.calendarCell,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellWithin: {
    backgroundColor: memoryColors.accentWash,
  },
  cellEdge: {
    backgroundColor: memoryColors.accent,
    borderRadius: memoryMetrics.calendarCell / 2,
  },
  cellInk: {
    ...memoryTypography.cell,
    color: memoryColors.title,
  },
  cellInkDisabled: {
    color: memoryColors.disabledInk,
  },
  cellInkEdge: {
    ...memoryTypography.cellSelected,
    color: memoryColors.card,
  },
  summary: {
    marginTop: 8,
    ...memoryTypography.meta,
    color: memoryColors.muted,
    textAlign: 'center',
    minHeight: 18,
  },
  done: {
    marginTop: memoryMetrics.dayGap,
    height: memoryMetrics.ctaHeight,
    borderRadius: memoryMetrics.ctaRadius,
    backgroundColor: memoryColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneDisabled: {
    backgroundColor: memoryColors.disabledWell,
  },
  doneInk: {
    ...memoryTypography.cta,
    color: memoryColors.card,
  },
  doneInkDisabled: {
    color: memoryColors.disabledInk,
  },
});
