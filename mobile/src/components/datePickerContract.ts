/**
 * The DatePicker's cross-platform contract (S1.3, ticket 04) — the shape both the native and web
 * forks honour, so a screen imports one `DatePicker` and never learns which platform it is on.
 *
 * The value is an ISO calendar date string (`"2027-01-10"`) or the empty string for "no date" — the
 * same wire shape the itinerary uses, so the screen threads it straight through with no conversion.
 * Dates are optional throughout (a someday trip has none, S0.3), which is why clearing to `""` is a
 * first-class outcome, not an error.
 */
export type DatePickerProps = {
  label: string;
  /** The current value as an ISO date (`"2027-01-10"`), or `""` for unset. */
  value: string;
  /** Called with the new ISO date, or `""` when cleared. */
  onChange: (isoDate: string) => void;
};
