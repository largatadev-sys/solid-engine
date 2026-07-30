import { countryByCode } from './countries';
import { INTERESTS, labelsFor } from './preferenceOptions';
import type { MeResponse } from '../types/api';


export const COMPLETION_HEADLINE = "You're all set!";

export const COMPLETION_BLURB = 'Your Largata account is ready.';

export const COMPLETION_CTA = 'Explore Largata';

export const SUMMARY_TITLE = 'Summary';


export function completionSummary(me: MeResponse): string[] {
  const rows: string[] = [];

  if (me.handle !== null) rows.push(`Signed in as @${me.handle}`);

  const interests = labelsFor(INTERESTS, me.interests);
  if (interests.length > 0) {
    rows.push(`${interests.length} ${interests.length === 1 ? 'Interest' : 'Interests'} selected`);
  }

  const based = basedIn(me);
  if (based !== null) rows.push(`Based in ${based}`);

  if (me.preferredCurrency !== null) {
    rows.push(`${me.preferredCurrency} is your preferred currency`);
  }

  return rows;
}


function basedIn(me: MeResponse): string | null {
  const country = countryByCode(me.country)?.name ?? null;
  const city = me.homeCity !== null && me.homeCity.trim() !== '' ? me.homeCity.trim() : null;

  if (city !== null && country !== null) return `${city}, ${country}`;
  return city ?? country;
}
