/**
 * The activity form's client-side rules (S1.3, ticket 02) — a courtesy, mirroring the server's, so a
 * traveler learns about a blank title or a bad time without a round trip. The server (its `@Pattern`
 * constraints and the `ActivityFields` value object) is the authority; when the two disagree it wins.
 *
 * Extracted from the screen so it is testable without rendering — the `validateItineraryForm` pattern.
 */
export function validateActivityForm(form: {
  title: string;
  timeOfDay: string;
  costAmount: string;
  costCurrency: string;
}): string | undefined {
  if (form.title.trim() === '') return 'An activity needs a title.';
  if (form.title.trim().length > 200) return 'A title may be at most 200 characters.';

  const time = form.timeOfDay.trim();
  // HH:mm or HH:mm:ss, 24-hour — the shapes the backend's @Pattern and LocalTime accept.
  if (time !== '' && !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(time)) {
    return 'A time of day must look like 14:00.';
  }

  const amount = form.costAmount.trim();
  const currency = form.costCurrency.trim();
  if (amount !== '' && !/^\d+(\.\d{1,2})?$/.test(amount)) {
    return 'An estimated cost must be a number like 500 or 500.00.';
  }
  // Amount and currency are one fact — the server rejects one without the other, so catch it here.
  if (amount !== '' && currency === '') return 'An estimated cost needs a currency (e.g. PHP).';
  if (currency !== '' && amount === '') return 'Enter an amount, or clear the currency.';

  return undefined;
}
