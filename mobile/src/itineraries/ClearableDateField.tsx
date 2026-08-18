import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DatePicker } from '../components/DatePicker';
import { colors, radii, spacing, typography } from '../theme';


interface ClearableDateFieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (isoDate: string) => void;
}


export function clearDateLabel(label: string): string {
  return `Clear ${label.toLowerCase()}`;
}


export function ClearableDateField({ label, value, onChange }: ClearableDateFieldProps) {
  return (
    <View style={styles.field}>
      <DatePicker label={label} value={value} onChange={onChange} />

      {value !== '' ? (
        <Pressable
          style={styles.clear}
          onPress={() => onChange('')}
          accessibilityRole="button"
          accessibilityLabel={clearDateLabel(label)}
          hitSlop={CLEAR_HIT_SLOP}
        >
          <Text style={styles.cross}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}


const CLEAR_HIT_SLOP = 8;
const CLEAR_SIZE = 22;

const styles = StyleSheet.create({
  field: {
    position: 'relative',
    justifyContent: 'flex-end',
  },
  clear: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    width: CLEAR_SIZE,
    height: CLEAR_SIZE,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  cross: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
