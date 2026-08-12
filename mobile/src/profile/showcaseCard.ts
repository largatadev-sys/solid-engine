import { currencySign } from '../itineraries/currencySign';
import { HOME_MARKET } from '../onboarding/localeDefaults';
import { PER_PERSON_SUFFIX } from './profileCopy';


export function showcaseMetaLine(destinations: readonly string[], durationDays: number): string | null {
  const parts = [...destinations];
  if (durationDays > 0) {
    parts.push(durationDays === 1 ? '1 day' : `${durationDays} days`);
  }

  return parts.length === 0 ? null : parts.join(' · ');
}


export function pricePillLabel(price: number | null): string | null {
  if (price === null) return null;

  const grouped = new Intl.NumberFormat('en-US').format(price);
  return `${currencySign(HOME_MARKET.currency)}${grouped} ${PER_PERSON_SUFFIX}`;
}
