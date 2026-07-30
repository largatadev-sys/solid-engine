import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';

interface PickerOption {
  readonly value: string;
  readonly label: string;
}

interface OptionPickerProps {
  readonly label: string;
  readonly value: string;
  readonly options: readonly PickerOption[];
  readonly onSelect: (value: string) => void;
}


export function OptionPicker({ label, value, options, onSelect }: OptionPickerProps) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        style={styles.shell}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? 'choose'}`}
      >
        <Text style={styles.value}>{current?.label ?? 'Choose'}</Text>
        <Text style={styles.chevron}>{'⌄'}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Close">
          <View style={styles.sheet}>
            <ScrollView>
              {options.map((option) => (
                <Pressable
                  key={option.value}
                  style={styles.row}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  onPress={() => {
                    onSelect(option.value);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.rowText, option.value === value && styles.rowSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const SHEET_MAX_HEIGHT = 420;
const SHEET_MAX_WIDTH = 420;

const styles = StyleSheet.create({
  field: { alignSelf: 'stretch', gap: spacing.sm },
  label: { ...typography.label, color: colors.textPrimary },
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
  },
  value: { ...typography.body, color: colors.textPrimary },
  chevron: { ...typography.body, color: colors.textSecondary },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surfaceMuted,
  },
  sheet: {
    width: '100%',
    maxWidth: SHEET_MAX_WIDTH,
    maxHeight: SHEET_MAX_HEIGHT,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  row: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  rowText: { ...typography.body, color: colors.textPrimary },
  rowSelected: { color: colors.accent },
});
