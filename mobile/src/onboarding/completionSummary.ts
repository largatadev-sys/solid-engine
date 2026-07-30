import { countryByCode } from './countries';
import { GOALS, INTERESTS, labelsFor } from './preferenceOptions';
import type { MeResponse } from '../types/api';


export interface SummaryLine {
  readonly label: string;
  readonly value: string;
}


export const COMPLETION_HEADLINE = 'You are all set';

export const COMPLETION_BLURB = 'Here is what we saved.';

export const COMPLETION_CTA = 'Go to My Trips';


export function completionSummary(me: MeResponse): SummaryLine[] {
  const lines: SummaryLine[] = [];

  if (me.handle !== null) lines.push({ label: 'Handle', value: `@${me.handle}` });

  const goals = labelsFor(GOALS, me.goals);
  if (goals.length > 0) lines.push({ label: 'Here to', value: goals.join(', ') });

  const interests = labelsFor(INTERESTS, me.interests);
  if (interests.length > 0) lines.push({ label: 'Interested in', value: interests.join(', ') });

  const based = basedIn(me);
  if (based !== null) lines.push({ label: 'Based in', value: based });

  if (me.preferredCurrency !== null) {
    lines.push({ label: 'Preferred currency', value: me.preferredCurrency });
  }

  return lines;
}


function basedIn(me: MeResponse): string | null {
  const country = countryByCode(me.country)?.name ?? null;
  const city = me.homeCity !== null && me.homeCity.trim() !== '' ? me.homeCity.trim() : null;

  if (city !== null && country !== null) return `${city}, ${country}`;
  return city ?? country;
}
