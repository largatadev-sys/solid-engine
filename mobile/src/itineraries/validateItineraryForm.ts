/**
 * The create form's client-side rules — a courtesy, not the enforcement.
 *
 * The server validates the same things and is the authority; this exists so a traveler learns about
 * a blank title without a round trip. When the two disagree the server wins by construction: it
 * rejects, and the screen shows what it said.
 *
 * Extracted from the screen so it is testable without rendering anything — and so the rules read as
 * rules rather than as form-handling code.
 */
export function validateItineraryForm(form: {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
}): string | undefined {
  if (form.title.trim() === '') return 'A title is required.';
  if (form.title.trim().length > 120) return 'A title may be at most 120 characters.';
  if (form.destination.trim() === '') return 'At least one destination is required.';

  const start = form.startDate.trim();
  const end = form.endDate.trim();
  if (start !== '' && !isCalendarDate(start)) return 'Start date must look like 2027-01-10.';
  if (end !== '' && !isCalendarDate(end)) return 'End date must look like 2027-01-10.';
  // Only when both are given — start-only ("departing June 3, open-ended") and end-only are
  // legitimate plans (S0.3 spec).
  if (start !== '' && end !== '' && start > end) return 'A trip cannot end before it starts.';

  return undefined;
}

/** ISO calendar dates only: no times, no timezones — a trip starts on a day (S0.3 spec). */
function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  // Catches 2027-02-31: the regex checks shape, this checks existence.
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}
