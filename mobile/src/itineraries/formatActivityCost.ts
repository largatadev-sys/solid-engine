/**
 * How an activity's estimated cost reads on a card (S1.3, ticket 02).
 *
 * Extracted from the Daily Schedules screen so the null/0/unstated distinction — the one bit of real
 * logic on the card — is testable without a renderer (the `formatDates` / query-options pattern).
 *
 * Three cases, and the difference between the first two is the whole point (spec §fields):
 * - unstated (`amount === null`): the traveler said nothing about cost → show nothing.
 * - free (`amount === "0"`): a real, stated fact → "Free".
 * - a price: "PHP 500", or just the amount if somehow no currency rode along.
 */
export function formatActivityCost(amount: string | null, currency: string | null): string | undefined {
  if (amount === null) return undefined;
  if (Number(amount) === 0) return 'Free';
  return currency !== null ? `${currency} ${amount}` : amount;
}

/** The card's meta line: time and cost joined by a dot, including only what is present. */
export function activityMetaLine(timeOfDay: string | null, amount: string | null, currency: string | null): string {
  const parts: string[] = [];
  if (timeOfDay !== null) parts.push(timeOfDay);
  const cost = formatActivityCost(amount, currency);
  if (cost !== undefined) parts.push(cost);
  return parts.join(' · ');
}
