import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { TimePickerProps } from './timePickerContract';
import { clockToDate, dateToClock, twelveHour } from '../itineraries/clockTime';
import { colors, radii, spacing, typography } from '../theme';


export function TimePicker({ label, value, onChange }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const shown = twelveHour(value);

  function handleChange(event: DateTimePickerEvent, picked?: Date) {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'set' && picked !== undefined) {
      onChange(dateToClock(picked));
    }
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          style={styles.input}
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          <Text style={shown === null ? styles.placeholder : styles.value}>{shown ?? 'Pick a time'}</Text>
        </Pressable>
        {shown !== null && (
          <Pressable onPress={() => onChange('')} accessibilityRole="button" accessibilityLabel="Clear time" hitSlop={8}>
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        )}
      </View>
      {open && (
        <DateTimePicker
          value={clockToDate(value) ?? new Date()}
          mode="time"
          display="spinner"
          is24Hour={false}
          onChange={handleChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: { ...typography.caption, color: colors.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  value: { ...typography.body, color: colors.textPrimary },
  placeholder: { ...typography.body, color: colors.textSecondary },
  clear: { ...typography.caption, color: colors.danger },
});
