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
  description: string;
  startDate: string;
  endDate: string;
  duration: string;
}): string | undefined {
  if (form.title.trim() === '') return 'A title is required.';
  if (form.title.trim().length > 120) return 'A title may be at most 120 characters.';
  if (form.destination.trim() === '') return 'At least one destination is required.';
  // The server bounds description at 4000 (Itinerary.MAX_DESCRIPTION_LENGTH); mirror it so a long
  // paste is caught without a round trip. Blank is fine — description is optional (S1.3).
  if (form.description.trim().length > 4000) return 'A description may be at most 4000 characters.';

  // Duration is optional (blank = an undated, zero-day skeleton). When given it must be a whole
  // number of days, 0..366 (Itinerary.MAX_DAYS) — the DTO's PositiveOrZero + Max, mirrored.
  const duration = form.duration.trim();
  if (duration !== '') {
    if (!/^\d+$/.test(duration)) return 'Duration must be a whole number of days.';
    if (Number(duration) > 366) return 'A trip can be at most 366 days.';
  }

  const start = form.startDate.trim();
  const end = form.endDate.trim();
  // The shape checks are defensive-only since ticket 04: the create screen now feeds ISO from the
  // DatePicker, which cannot produce a malformed string, so these branches are unreachable from the
  // UI. Kept (not dropped like the edit form's) because this function's contract is "validate a
  // date-shaped string" and a non-UI caller could still pass a bad one — belt-and-suspenders, stated.
  if (start !== '' && !isCalendarDate(start)) return 'Start date must look like 2027-01-10.';
  if (end !== '' && !isCalendarDate(end)) return 'End date must look like 2027-01-10.';
  // Only when both are given — start-only ("departing June 3, open-ended") and end-only are
  // legitimate plans (S0.3 spec).
  if (start !== '' && end !== '' && start > end) return 'A trip cannot end before it starts.';

  return undefined;
}

/**
 * The edit form's rules (S1.3, ticket 04). Distinct from the create form: destinations arrive
 * already-cleaned as a list (the edit screen edits them as rows), dates arrive already-ISO from the
 * picker (no format check needed — the picker cannot produce a malformed date), and there is no
 * duration. Mirrors the backend's `UpdateItineraryRequest` + `validateFields`.
 */
export function validateItineraryEdit(form: {
  title: string;
  destinations: string[];
  description: string;
  startDate: string;
  endDate: string;
}): string | undefined {
  if (form.title.trim() === '') return 'A title is required.';
  if (form.title.trim().length > 120) return 'A title may be at most 120 characters.';
  if (form.destinations.length === 0) return 'At least one destination is required.';
  if (form.description.trim().length > 4000) return 'A description may be at most 4000 characters.';
  // Dates come from the picker as ISO or "", so no shape check — only the cross-field rule remains.
  if (form.startDate !== '' && form.endDate !== '' && form.startDate > form.endDate) {
    return 'A trip cannot end before it starts.';
  }
  return undefined;
}

/** ISO calendar dates only: no times, no timezones — a trip starts on a day (S0.3 spec). */
function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  // Catches 2027-02-31: the regex checks shape, this checks existence.
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}
