import type { ActivityRequest, ActivityResponse } from '../types/api';


export type ActivityFormValues = {
  title: string;
  timeOfDay?: string;
  place?: string;
  costAmount?: string;
  costCurrency?: string;
  externalUrl?: string;
};


const CARRIED_OVER = [
  'description',
  'notes',
  'bookingPurpose',
  'bookingProvider',
  'bookingPriceAmount',
  'bookingPriceCurrency',
] as const;


export function buildActivityRequest(
  form: ActivityFormValues,
  existing: ActivityResponse | undefined,
): ActivityRequest {
  const request: ActivityRequest = { title: form.title.trim() };

  const time = trimmed(form.timeOfDay);
  if (time !== undefined) request.timeOfDay = time;

  const place = trimmed(form.place);
  if (place !== undefined) request.place = place;

  const amount = trimmed(form.costAmount);
  const currency = trimmed(form.costCurrency);
  if (amount !== undefined && currency !== undefined) {
    request.costAmount = amount;
    request.costCurrency = currency;
  }

  const link = trimmed(form.externalUrl);
  if (link !== undefined) request.externalUrl = link;

  if (existing !== undefined) {
    for (const field of CARRIED_OVER) {
      const value = existing[field];
      if (value !== null && value !== '') request[field] = value;
    }
  }

  return request;
}


function trimmed(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const cleaned = value.trim();
  return cleaned === '' ? undefined : cleaned;
}
