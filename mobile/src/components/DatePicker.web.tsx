import { StyleSheet, Text, View } from 'react-native';
import type { DatePickerProps } from './datePickerContract';
import { colors, radii, spacing, typography } from '../theme';

/**
 * DatePicker, web fork (S1.3, ticket 04) — the browser-native `<input type="date">`.
 *
 * The standing principle (web ≈ mobile except native-only functions, S0.6): the web surface uses the
 * platform's own date control rather than reimplementing the native picker. The input's value is
 * already an ISO date (`"2027-01-10"`), which is exactly the contract's shape, so it threads straight
 * through — and clearing the field yields `""`, the contract's "no date". Rendered via a raw DOM
 * element (React web) inside an RN `View`, which is how Expo web composes the two.
 *
 * The DOM input is styled from the theme tokens — not raw hex — so the web control repaints with the
 * brand decision like every RN surface (the no-hardcoded-values rule, `layering.test.ts`; a DOM
 * element does not exempt a screen from it). The token values are plain strings/numbers, usable in a
 * CSS style object as-is.
 */
export function DatePicker({ label, value, onChange }: DatePickerProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {/* @ts-expect-error — a DOM input inside RN-web: valid at runtime (Expo web renders to the DOM),
          but outside react-native's JSX types. The web fork is the one place this crossover is honest. */}
      <input
        type="date"
        value={value}
        onChange={(event: { target: { value: string } }) => onChange(event.target.value)}
        style={webInputStyle}
        aria-label={label}
      />
    </View>
  );
}

/**
 * Plain CSS (not RN StyleSheet) — this is a DOM element — but every value comes from the theme, so it
 * matches the RN inputs beside it and moves with the palette. `typography.body.fontSize` is the same
 * source the RN inputs read; referencing it (not a literal `16`) keeps the type scale the one owner of
 * sizes.
 */
const webInputStyle = {
  fontSize: typography.body.fontSize,
  color: colors.textPrimary,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderStyle: 'solid' as const,
  borderColor: colors.border,
  borderRadius: radii.sm,
  paddingTop: spacing.sm,
  paddingBottom: spacing.sm,
  paddingLeft: spacing.md,
  paddingRight: spacing.md,
};

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: { ...typography.caption, color: colors.textSecondary },
});
