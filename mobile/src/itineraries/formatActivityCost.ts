import { currencySign, isKnownCurrency } from './currencies';


export function formatActivityCost(amount: string | null, currency: string | null): string | undefined {
  if (amount === null) return undefined;

  const value = Number(amount);
  if (Number.isNaN(value)) return amount;
  if (value === 0) return 'Free';

  const shown = grouped(value);
  if (currency === null || currency.trim() === '') return shown;

  const sign = currencySign(currency);
  return isKnownCurrency(currency) ? `${sign}${shown}` : `${sign} ${shown}`;
}


function grouped(value: number): string {
  const digits = Number.isInteger(value) ? 0 : 2;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}


export type ActivityMetaParts = { clock: string | undefined; place: string | undefined };


export function activityMetaParts(
  timeOfDay: string | null,
  place: string | null,
): ActivityMetaParts {
  const where = (place ?? '').trim();

  return {
    clock: unpaddedTimeOfDay(timeOfDay),
    place: where === '' ? undefined : where,
  };
}


export function activityMetaLine(timeOfDay: string | null, place: string | null): string {
  const { place: where } = activityMetaParts(timeOfDay, place);
  return [formatTimeOfDay(timeOfDay), where].filter((part) => part !== undefined).join(' • ');
}


const NOON = 12;


export function formatTimeOfDay(timeOfDay: string | null): string | undefined {
  return twelveHourClock(timeOfDay, 2);
}


export function unpaddedTimeOfDay(timeOfDay: string | null): string | undefined {
  return twelveHourClock(timeOfDay, 1);
}


function twelveHourClock(timeOfDay: string | null, hourDigits: number): string | undefined {
  if (timeOfDay === null) return undefined;

  const match = /^(\d{1,2}):(\d{2})/.exec(timeOfDay);
  if (match === null) return timeOfDay;

  const hours = Number(match[1]);
  const minutes = match[2] as string;
  if (!Number.isInteger(hours) || hours < 0 || hours > 23) return timeOfDay;

  const suffix = hours < NOON ? 'AM' : 'PM';
  const onTheClock = hours % NOON === 0 ? NOON : hours % NOON;
  return `${String(onTheClock).padStart(hourDigits, '0')}:${minutes} ${suffix}`;
}
