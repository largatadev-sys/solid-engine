import { Pressable, StyleSheet, Text, View } from 'react-native';
import { memoryColors, memoryMetrics, memoryMotion, memoryTypography } from '../theme/memoryTokens';
import type { DateRange } from './dateRange';
import { DIARY_END_LABEL, DIARY_START_LABEL, DIARY_WHEN_LABEL, shortDate } from './memoryCopy';


interface DateChipsProps {
  readonly range: DateRange;
  readonly required?: boolean;
  readonly onPress: () => void;
}


export function DateChips({ range, required = true, onPress }: DateChipsProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {DIARY_WHEN_LABEL}
        {required ? <Text style={styles.required}>*</Text> : null}
      </Text>
      <View style={styles.row}>
        <Chip
          caption={DIARY_START_LABEL}
          value={range.start === null ? null : shortDate(range.start)}
          placeholder={DIARY_START_LABEL}
          onPress={onPress}
        />
        <Chip
          caption={DIARY_END_LABEL}
          value={range.end === null ? null : shortDate(range.end)}
          placeholder="End date"
          onPress={onPress}
        />
      </View>
    </View>
  );
}


function Chip({
  caption,
  value,
  placeholder,
  onPress,
}: {
  readonly caption: string;
  readonly value: string | null;
  readonly placeholder: string;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) =>
        StyleSheet.flatten([styles.chip, pressed ? styles.pressed : null])
      }
      accessibilityRole="button"
      accessibilityLabel={caption}
      onPress={onPress}
    >
      <Text style={[styles.value, value === null ? styles.valueEmpty : null]}>
        {value ?? placeholder}
      </Text>
      <Text style={styles.caption}>{caption.toUpperCase()}</Text>
    </Pressable>
  );
}


const styles = StyleSheet.create({
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
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    height: memoryMetrics.chipHeight,
    borderWidth: 1,
    borderColor: memoryColors.hairline,
    borderRadius: memoryMetrics.chipRadius,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: memoryColors.card,
  },
  value: {
    ...memoryTypography.input,
    color: memoryColors.title,
  },
  valueEmpty: {
    color: memoryColors.faint,
  },
  caption: {
    ...memoryTypography.chipCaption,
    color: memoryColors.faint,
  },
  pressed: {
    opacity: memoryMotion.pressOpacity,
  },
});
