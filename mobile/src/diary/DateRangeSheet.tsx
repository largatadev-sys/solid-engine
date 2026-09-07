import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { memoryColors, memoryMetrics, memoryMotion, memoryTypography } from '../theme/memoryTokens';
import {
  CALENDAR_DONE,
  CALENDAR_NEXT_MONTH,
  CALENDAR_PICK_END,
  CALENDAR_PREVIOUS_MONTH,
  DIARY_END_LABEL,
  DIARY_START_LABEL,
  DIARY_WHEN_LABEL,
  rangeSummary,
  shortDate,
} from './memoryCopy';
import { MemoryCta } from './MemoryCta';
import { MemoryIcon } from './MemoryIcon';
import { MemorySheet } from './MemorySheet';
import {
  dayCountOf,
  emptyRange,
  isComplete,
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
  const settingEnd = draft.start !== null && draft.end === null;
  const ready = mode === 'single' ? draft.start !== null : isComplete(draft);

  return (
    <MemorySheet open={open} title={title} onDismiss={onDismiss}>
      {mode === 'range' && (
        <View style={styles.chips}>
          <Chip
            caption={DIARY_START_LABEL}
            value={draft.start === null ? null : shortDate(draft.start)}
            placeholder={DIARY_START_LABEL}
            active={!settingEnd}
          />
          <Chip
            caption={DIARY_END_LABEL}
            value={draft.end === null ? null : shortDate(draft.end)}
            placeholder="End date"
            active={settingEnd}
          />
        </View>
      )}

      <View style={styles.monthRow}>
        <MonthStep
          direction="left"
          label={CALENDAR_PREVIOUS_MONTH}
          onPress={() => setShown(steppedBy(shown, -1))}
        />
        <Text style={styles.monthName}>
          {MONTH_NAMES[shown.monthIndex]} {shown.year}
        </Text>
        <MonthStep
          direction="right"
          label={CALENDAR_NEXT_MONTH}
          onPress={() => setShown(steppedBy(shown, 1))}
        />
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
            ? ' '
            : shortDate(draft.start)
          : ready
            ? rangeSummary(dayCountOf(draft))
            : settingEnd
              ? CALENDAR_PICK_END
              : ' '}
      </Text>

      <MemoryCta
        label={CALENDAR_DONE}
        inset={false}
        disabled={!ready}
        onPress={() => onDone(mode === 'single' ? { start: draft.start, end: draft.start } : draft)}
      />
    </MemorySheet>
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
  const isStart = day === range.start;
  const isEnd = day === range.end;
  const edge = isStart || isEnd;
  const within = isWithin(range, day) && !edge;
  const spans = isComplete(range) && range.start !== range.end;

  return (
    <Pressable
      style={styles.cell}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: edge }}
      accessibilityLabel={shortDate(day)}
      onPress={() => onPress(day)}
    >
      {within && <View style={styles.band} />}
      {spans && isStart && <View style={[styles.band, styles.bandRight]} />}
      {spans && isEnd && <View style={[styles.band, styles.bandLeft]} />}
      <View style={StyleSheet.flatten([styles.dot, edge ? styles.dotEdge : null])}>
        <Text
          style={[
            styles.cellInk,
            disabled ? styles.cellInkDisabled : null,
            edge ? styles.cellInkEdge : null,
          ]}
        >
          {Number(day.slice(8))}
        </Text>
      </View>
    </Pressable>
  );
}


function Chip({
  caption,
  value,
  placeholder,
  active,
}: {
  readonly caption: string;
  readonly value: string | null;
  readonly placeholder: string;
  readonly active: boolean;
}) {
  return (
    <View style={StyleSheet.flatten([styles.chip, active ? styles.chipActive : null])}>
      <Text style={[styles.chipValue, value === null ? styles.chipValueEmpty : null]}>
        {value ?? placeholder}
      </Text>
      <Text style={[styles.chipCaption, active ? styles.chipCaptionActive : null]}>
        {caption.toUpperCase()}
      </Text>
    </View>
  );
}


function MonthStep({
  direction,
  label,
  onPress,
}: {
  readonly direction: 'left' | 'right';
  readonly label: string;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) =>
        StyleSheet.flatten([styles.monthStep, pressed ? styles.monthStepPressed : null])
      }
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
    >
      <MemoryIcon
        name={direction === 'left' ? 'chevronLeft' : 'chevronRightSmall'}
        size={memoryMetrics.calendarChevron}
        color={memoryColors.title}
      />
    </Pressable>
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
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    flex: 1,
    height: memoryMetrics.chipHeight,
    borderWidth: 1,
    borderColor: memoryColors.hairline,
    borderRadius: memoryMetrics.chipRadius,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  chipActive: {
    borderWidth: memoryMetrics.chipActiveBorder,
    borderColor: memoryColors.accent,
  },
  chipValue: {
    ...memoryTypography.input,
    color: memoryColors.title,
  },
  chipValueEmpty: {
    color: memoryColors.faint,
  },
  chipCaption: {
    ...memoryTypography.chipCaption,
    color: memoryColors.faint,
  },
  chipCaptionActive: {
    color: memoryColors.accent,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  monthName: {
    ...memoryTypography.monthName,
    color: memoryColors.title,
  },
  monthStep: {
    width: memoryMetrics.headerButton,
    height: memoryMetrics.headerButton,
    borderRadius: memoryMetrics.headerButton / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthStepPressed: {
    transform: [{ scale: memoryMotion.roundPressScale }],
  },
  weekdays: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekday: {
    ...memoryTypography.weekday,
    flexBasis: `${100 / 7}%`,
    textAlign: 'center',
    color: memoryColors.faint,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: memoryMetrics.calendarRowGap,
  },
  cell: {
    flexBasis: `${100 / 7}%`,
    height: memoryMetrics.calendarCell,
    alignItems: 'center',
    justifyContent: 'center',
  },
  band: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: memoryColors.rangeBand,
  },
  bandRight: {
    left: '50%',
  },
  bandLeft: {
    right: '50%',
  },
  dot: {
    width: memoryMetrics.calendarCell,
    height: memoryMetrics.calendarCell,
    borderRadius: memoryMetrics.calendarCell / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotEdge: {
    backgroundColor: memoryColors.accent,
  },
  cellInk: {
    ...memoryTypography.calendarCell,
    color: memoryColors.title,
  },
  cellInkDisabled: {
    color: memoryColors.disabledDate,
  },
  cellInkEdge: {
    ...memoryTypography.calendarEdge,
    color: memoryColors.white,
  },
  summary: {
    ...memoryTypography.meta13,
    color: memoryColors.muted,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
});
