/**
 * The destinations-list edit operations (S1.3, ticket 04) — add a row, remove a row, set a row —
 * as pure functions, extracted from the edit screen so the row management is testable without a
 * renderer (the `reorderActivityIds` pattern).
 *
 * Destinations are a list (canon), edited as rows. The invariant the caller relies on: submission
 * cleans and drops blanks (`cleanDestinations`), and the backend then enforces min-one-non-blank —
 * so the UI can hold a transient empty row (a just-added one the traveler hasn't filled) without that
 * being an error until submit.
 */

/** Adds an empty row to the end — a new destination to fill. */
export function addDestination(destinations: string[]): string[] {
  return [...destinations, ''];
}

/** Removes the row at {@code index}. The caller only offers this when more than one row exists. */
export function removeDestination(destinations: string[], index: number): string[] {
  return destinations.filter((_, i) => i !== index);
}

/** Sets the row at {@code index} to a new value. */
export function setDestination(destinations: string[], index: number, value: string): string[] {
  return destinations.map((d, i) => (i === index ? value : d));
}

/** The submit-time cleaning: trim every row, drop the blanks — what goes to the server. */
export function cleanDestinations(destinations: string[]): string[] {
  return destinations.map((d) => d.trim()).filter((d) => d !== '');
}
