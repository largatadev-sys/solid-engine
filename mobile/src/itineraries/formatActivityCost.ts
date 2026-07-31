import { currencySign, isKnownCurrency } from './currencySign';


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


export function activityMetaLine(timeOfDay: string | null, amount: string | null, currency: string | null): string {
  const parts: string[] = [];
  const clock = formatTimeOfDay(timeOfDay);
  if (clock !== undefined) parts.push(clock);
  const cost = formatActivityCost(amount, currency);
  if (cost !== undefined) parts.push(cost);
  return parts.join(' · ');
}


const NOON = 12;


export function formatTimeOfDay(timeOfDay: string | null): string | undefined {
  if (timeOfDay === null) return undefined;

  const match = /^(\d{1,2}):(\d{2})/.exec(timeOfDay);
  if (match === null) return timeOfDay;

  const hours = Number(match[1]);
  const minutes = match[2] as string;
  if (!Number.isInteger(hours) || hours < 0 || hours > 23) return timeOfDay;

  const suffix = hours < NOON ? 'AM' : 'PM';
  const onTheClock = hours % NOON === 0 ? NOON : hours % NOON;
  return `${String(onTheClock).padStart(2, '0')}:${minutes} ${suffix}`;
}
