import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MediaThumb } from '../media/MediaThumb';
import { memoryColors, memoryMetrics, memoryMotion, memoryTypography } from '../theme/memoryTokens';
import type { DiaryDayResponse, DiarySectionResponse } from '../types/api';
import {
  ADD_FAILED_LINE,
  ADD_TO_DIARY_TITLE,
  FILING_NEW_DIARY_ROW,
  FILING_NO_DIARIES,
  FILING_SEARCH_PLACEHOLDER,
  FILING_SEARCH_THRESHOLD,
  FILING_STEP_ONE,
  FILING_STEP_TWO,
  addToDayCta,
  dayMetaLine,
  dayOrdinalLabel,
  postcardCountLabel,
  sectionMetaLine,
} from './memoryCopy';
import { MemoryCta } from './MemoryCta';
import { MemoryIcon } from './MemoryIcon';
import { MemorySheet } from './MemorySheet';


interface FilingPickerProps {
  readonly open: boolean;
  readonly diaries: readonly DiarySectionResponse[];
  readonly failed: boolean;
  readonly filing: boolean;
  readonly onFile: (diaryId: string, dayId: string) => void;
  readonly onNewDiary: () => void;
  readonly onDismiss: () => void;
}


export function FilingPicker({
  open,
  diaries,
  failed,
  filing,
  onFile,
  onNewDiary,
  onDismiss,
}: FilingPickerProps) {
  const [chosen, setChosen] = useState<DiarySectionResponse | null>(null);
  const [dayId, setDayId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) {
      setChosen(null);
      setDayId(null);
      setQuery('');
      return;
    }
    if (diaries.length === 1) setChosen(diaries[0] ?? null);
  }, [open, diaries]);

  if (chosen !== null) {
    const day = chosen.days.find((candidate) => candidate.id === dayId) ?? null;

    return (
      <MemorySheet
        open={open}
        title={chosen.title}
        subtitle={FILING_STEP_TWO}
        leading={
          <Pressable
            style={({ pressed }) => StyleSheet.flatten([styles.backButton, pressed ? styles.pressed : null])}
            accessibilityRole="button"
            accessibilityLabel={ADD_TO_DIARY_TITLE}
            onPress={() => {
              setChosen(null);
              setDayId(null);
            }}
          >
            <MemoryIcon name="chevronLeft" size={18} color={memoryColors.title} />
          </Pressable>
        }
        scrolls
        onDismiss={onDismiss}
      >
        {chosen.days.map((candidate) => (
          <DayRow
            key={candidate.id}
            day={candidate}
            selected={candidate.id === dayId}
            onPress={() => setDayId(candidate.id)}
          />
        ))}

        <View style={styles.ctaWell}>
          <MemoryCta
            label={addToDayCta(day?.ordinal ?? 0)}
            inset={false}
            disabled={day === null}
            busy={filing}
            onPress={() => {
              if (day !== null) onFile(chosen.id, day.id);
            }}
          />
          {failed && <Text style={styles.failed}>{ADD_FAILED_LINE}</Text>}
        </View>
      </MemorySheet>
    );
  }

  const shown =
    query.trim() === ''
      ? diaries
      : diaries.filter((diary) => diary.title.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <MemorySheet
      open={open}
      title={ADD_TO_DIARY_TITLE}
      subtitle={FILING_STEP_ONE}
      cancel
      scrolls
      onDismiss={onDismiss}
    >
      {diaries.length >= FILING_SEARCH_THRESHOLD && (
        <View style={styles.search}>
          <MemoryIcon name="search" size={16} color={memoryColors.muted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={FILING_SEARCH_PLACEHOLDER}
            placeholderTextColor={memoryColors.faint}
            accessibilityLabel={FILING_SEARCH_PLACEHOLDER}
          />
        </View>
      )}

      {diaries.length === 0 ? (
        <>
          <Text style={styles.none}>{FILING_NO_DIARIES}</Text>
          <Pressable
            style={({ pressed }) => StyleSheet.flatten([styles.row, styles.rowLast, pressed ? styles.pressed : null])}
            accessibilityRole="button"
            accessibilityLabel={FILING_NEW_DIARY_ROW}
            onPress={onNewDiary}
          >
            <View style={styles.newTile}>
              <MemoryIcon name="bookPlus" size={20} color={memoryColors.accent} />
            </View>
            <Text style={styles.rowTitle}>{FILING_NEW_DIARY_ROW}</Text>
            <MemoryIcon name="chevronRight" size={16} color={memoryColors.faint} strokeWidth={2.2} />
          </Pressable>
        </>
      ) : (
        shown.map((diary, index) => (
          <DiaryRow
            key={diary.id}
            diary={diary}
            last={index === shown.length - 1}
            onPress={() => setChosen(diary)}
          />
        ))
      )}

      {failed && <Text style={styles.failed}>{ADD_FAILED_LINE}</Text>}
    </MemorySheet>
  );
}


function DiaryRow({
  diary,
  last,
  onPress,
}: {
  readonly diary: DiarySectionResponse;
  readonly last: boolean;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) =>
        StyleSheet.flatten([styles.row, last ? styles.rowLast : null, pressed ? styles.pressed : null])
      }
      accessibilityRole="button"
      accessibilityLabel={diary.title}
      onPress={onPress}
    >
      <MediaThumb
        url={diary.cover?.url ?? null}
        style={styles.thumb}
        accessibilityLabel={diary.title}
        fallback={<View style={styles.thumbWell} />}
      />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>{diary.title}</Text>
        <Text style={styles.rowMeta}>{sectionMetaLine(diary.destination, diary.dayCount)}</Text>
      </View>
      <MemoryIcon name="chevronRight" size={16} color={memoryColors.faint} strokeWidth={2.2} />
    </Pressable>
  );
}


function DayRow({
  day,
  selected,
  onPress,
}: {
  readonly day: DiaryDayResponse;
  readonly selected: boolean;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) =>
        StyleSheet.flatten([
          styles.dayRow,
          selected ? styles.dayRowSelected : null,
          pressed && !selected ? styles.dayRowPressed : null,
        ])
      }
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={dayOrdinalLabel(day.ordinal)}
      onPress={onPress}
    >
      <View style={styles.dayLeft}>
        <Text style={styles.dayLabel}>{dayOrdinalLabel(day.ordinal)}</Text>
        <Text style={styles.dayMeta}>{dayMetaLine(day.date, day.place)}</Text>
      </View>
      {selected ? (
        <View style={styles.check}>
          <MemoryIcon name="check" size={11} color={memoryColors.white} strokeWidth={2.5} />
        </View>
      ) : (
        <Text style={styles.dayCount}>{postcardCountLabel(day.postcardCount)}</Text>
      )}
    </Pressable>
  );
}


const styles = StyleSheet.create({
  backButton: {
    width: memoryMetrics.headerButton,
    height: memoryMetrics.headerButton,
    borderRadius: memoryMetrics.headerButton / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: memoryMetrics.headerButtonPull,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: memoryMetrics.placeFieldHeight,
    borderWidth: 1,
    borderColor: memoryColors.hairline,
    borderRadius: memoryMetrics.fieldRadius,
    paddingHorizontal: memoryMetrics.fieldPaddingH,
    marginBottom: 6,
  },
  searchInput: {
    ...memoryTypography.input,
    flex: 1,
    color: memoryColors.title,
    paddingVertical: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: memoryMetrics.filingRowPaddingV,
    borderBottomWidth: 1,
    borderBottomColor: memoryColors.divider,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  thumb: {
    width: memoryMetrics.sectionThumb,
    height: memoryMetrics.sectionThumb,
    borderRadius: memoryMetrics.sectionThumbRadius,
    flexShrink: 0,
  },
  thumbWell: {
    width: '100%',
    height: '100%',
    backgroundColor: memoryColors.wellDivider,
  },
  newTile: {
    width: memoryMetrics.sectionThumb,
    height: memoryMetrics.sectionThumb,
    borderRadius: memoryMetrics.sectionThumbRadius,
    backgroundColor: memoryColors.highlightWash,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitle: {
    ...memoryTypography.cardTitle,
    color: memoryColors.title,
    flex: 1,
  },
  rowMeta: {
    ...memoryTypography.cardMeta,
    color: memoryColors.muted,
  },
  none: {
    ...memoryTypography.meta13,
    color: memoryColors.muted,
    paddingVertical: 10,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: memoryMetrics.filingRowPaddingV,
    paddingHorizontal: memoryMetrics.sheetPaddingH,
    marginHorizontal: -memoryMetrics.sheetPaddingH,
    borderBottomWidth: 1,
    borderBottomColor: memoryColors.divider,
  },
  dayRowSelected: {
    backgroundColor: memoryColors.highlightWash,
  },
  dayRowPressed: {
    backgroundColor: memoryColors.paper,
  },
  dayLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  dayLabel: {
    ...memoryTypography.dayRowTitle,
    color: memoryColors.title,
  },
  dayMeta: {
    ...memoryTypography.meta13,
    color: memoryColors.muted,
  },
  dayCount: {
    ...memoryTypography.counter,
    color: memoryColors.faint,
  },
  check: {
    width: memoryMetrics.checkSize,
    height: memoryMetrics.checkSize,
    borderRadius: memoryMetrics.checkSize / 2,
    backgroundColor: memoryColors.check,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaWell: {
    paddingTop: 14,
    gap: 8,
  },
  failed: {
    ...memoryTypography.meta13,
    color: memoryColors.danger,
    paddingTop: 8,
  },
  pressed: {
    opacity: memoryMotion.pressOpacity,
  },
});
