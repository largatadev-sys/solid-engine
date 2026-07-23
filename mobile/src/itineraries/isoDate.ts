/**
 * ISO calendar-date helpers (S1.3, ticket 04) — the conversions the DatePicker forks share, extracted
 * so the fiddly bits (timezone-safe parsing, zero-padding) are tested without a renderer.
 *
 * A calendar date is a day, not an instant: "2027-01-10" means that date everywhere on earth (S0.3).
 * So parsing and formatting must never route through a local-timezone `Date` that could shift the day
 * across a midnight boundary — these build the string from UTC parts and parse into a UTC `Date`.
 */

/** True if the string is a well-formed ISO calendar date (`YYYY-MM-DD`) that actually exists. */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  // The regex checks shape; this catches 2027-02-31 (a shape that parses to a different day).
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

/** An ISO date string → a UTC `Date` at midnight, or `undefined` when unset/invalid. */
export function isoToDate(value: string): Date | undefined {
  if (!isIsoDate(value)) return undefined;
  return new Date(`${value}T00:00:00Z`);
}

/** A `Date` → its ISO calendar date, read in UTC so the day never shifts across a timezone boundary. */
export function dateToIso(date: Date): string {
  const year = date.getUTCFullYear().toString().padStart(4, '0');
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}
