import { formatActivityCost } from './formatActivityCost';


export function placeAndCost(
  place: string | null,
  amount: string | null,
  currency: string | null,
): string | undefined {
  const parts = [place, formatActivityCost(amount, currency)].filter(
    (part): part is string => part !== null && part !== undefined && part !== '',
  );
  return parts.length === 0 ? undefined : parts.join(' • ');
}
