import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { DatePickerProps } from './datePickerContract';
import { dateToIso, isoToDate } from '../itineraries/isoDate';
import { colors, radii, spacing, typography } from '../theme';


export function DatePicker({ label, value, onChange }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const current = isoToDate(value);

  function handleChange(event: DateTimePickerEvent, picked?: Date) {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'set' && picked !== undefined) {
      onChange(dateToIso(picked));
    }
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable style={styles.input} onPress={() => setOpen(true)} accessibilityRole="button">
          <Text style={value === '' ? styles.placeholder : styles.value}>{value === '' ? 'Pick a date' : value}</Text>
        </Pressable>
        {value !== '' && (
          <Pressable onPress={() => onChange('')} accessibilityRole="button" accessibilityLabel="Clear date" hitSlop={8}>
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        )}
      </View>
      {open && (
        <DateTimePicker
          value={current ?? new Date()}
          mode="date"
          display="default"
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
