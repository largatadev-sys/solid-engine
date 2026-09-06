import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import { BottomSheet } from '../members/BottomSheet';
import { memoryColors, memoryMetrics, memoryTypography } from '../theme/memoryTokens';
import type { DiaryDayResponse, DiarySectionResponse } from '../types/api';
import {
  ADD_FAILED_LINE,
  ADD_TO_DIARY_TITLE,
  CHOOSE_A_DAY_TITLE,
  NO_POSTCARDS_ON_THIS_DAY,
  dayDateLabel,
  dayOrdinalLabel,
  sectionMetaLine,
} from './memoryCopy';


interface FilingPickerProps {
  readonly open: boolean;
  readonly diaries: readonly DiarySectionResponse[];
  readonly failed: boolean;
  readonly onFile: (diaryId: string, dayId: string) => void;
  readonly onDismiss: () => void;
}


export function FilingPicker({
  open,
  diaries,
  failed,
  onFile,
  onDismiss,
}: FilingPickerProps) {
  const [chosen, setChosen] = useState<DiarySectionResponse | null>(null);

  function dismiss(): void {
    setChosen(null);
    onDismiss();
  }

  if (chosen !== null) {
    return (
      <BottomSheet open={open} title={CHOOSE_A_DAY_TITLE} onDismiss={dismiss}>
        {chosen.days.length === 0 ? (
          <Text style={styles.empty}>{NO_POSTCARDS_ON_THIS_DAY}</Text>
        ) : (
          chosen.days.map((day) => (
            <DayRow key={day.id} day={day} onPress={() => onFile(chosen.id, day.id)} />
          ))
        )}
        {failed && <Text style={styles.failed}>{ADD_FAILED_LINE}</Text>}
      </BottomSheet>
    );
  }

  return (
    <BottomSheet open={open} title={ADD_TO_DIARY_TITLE} onDismiss={dismiss}>
      {diaries.map((diary) => (
        <DiaryRow key={diary.id} diary={diary} onPress={() => setChosen(diary)} />
      ))}
      {failed && <Text style={styles.failed}>{ADD_FAILED_LINE}</Text>}
    </BottomSheet>
  );
}


function DiaryRow({
  diary,
  onPress,
}: {
  readonly diary: DiarySectionResponse;
  readonly onPress: () => void;
}) {
  const press = usePressFeedback();

  return (
    <AnimatedPressable
      style={StyleSheet.flatten([styles.row, press.style])}
      accessibilityRole="button"
      accessibilityLabel={diary.title}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <View>
        <Text style={styles.title}>{diary.title}</Text>
        <Text style={styles.meta}>{sectionMetaLine(diary.destination, diary.dayCount)}</Text>
      </View>
    </AnimatedPressable>
  );
}


function DayRow({
  day,
  onPress,
}: {
  readonly day: DiaryDayResponse;
  readonly onPress: () => void;
}) {
  const press = usePressFeedback();

  return (
    <AnimatedPressable
      style={StyleSheet.flatten([styles.row, press.style])}
      accessibilityRole="button"
      accessibilityLabel={dayOrdinalLabel(day.ordinal)}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <View>
        <Text style={styles.title}>{dayOrdinalLabel(day.ordinal)}</Text>
        <Text style={styles.meta}>
          {dayDateLabel(day.date)}
          {day.place === null ? '' : ` · ${day.place}`}
        </Text>
      </View>
    </AnimatedPressable>
  );
}


const styles = StyleSheet.create({
  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: memoryColors.hairline,
  },
  title: {
    ...memoryTypography.input,
    color: memoryColors.title,
  },
  meta: {
    ...memoryTypography.small,
    color: memoryColors.muted,
    marginTop: 2,
  },
  empty: {
    ...memoryTypography.meta,
    color: memoryColors.faint,
    paddingVertical: memoryMetrics.dayGap,
  },
  failed: {
    ...memoryTypography.meta,
    color: memoryColors.danger,
    paddingTop: memoryMetrics.dayGap,
  },
});
