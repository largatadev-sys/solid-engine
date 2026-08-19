import type { ForkedFromResponse } from '../types/api';


export const FORK_CTA_LABEL = 'Fork This Trip';

export const FORK_SHEET_TITLE = 'Fork This Trip';

export const FORK_SHEET_BODY =
  'Create your own editable copy of this itinerary. Customize the plan, invite your travel group, and make it yours.';

export const FORK_HONESTY_LINE = "The plan copies. Photos and dates don't.";

export const FORK_CONFIRM_LABEL = 'Fork It';

export const FORK_CANCEL_LABEL = 'Cancel';

export const FORK_SUCCESS_TITLE = 'Trip Forked!';

export const OPEN_FORKED_WORKSPACE_LABEL = 'Open Trip Workspace';

export const FORKED_STAT_LABEL = 'Forked';

export const ANONYMOUS_AUTHOR = 'a traveler';


export type ForkHighlight = { readonly icon: 'shieldCheck' | 'workspace' | 'travelGroup'; readonly text: string };


export function forkHighlights(sourceHandle: string | null): readonly ForkHighlight[] {
  return [
    { icon: 'shieldCheck', text: `Keeps credit with ${authorMention(sourceHandle)}` },
    { icon: 'workspace', text: 'Creates your own Trip Workspace' },
    { icon: 'travelGroup', text: 'Invite your travel group' },
  ];
}


export function attributionLabel(forkedFrom: ForkedFromResponse | null | undefined): string | undefined {
  if (forkedFrom === null || forkedFrom === undefined) return undefined;
  return `Original by ${authorMention(forkedFrom.ownerHandle)}`;
}


export function attributionLinks(forkedFrom: ForkedFromResponse | null | undefined): boolean {
  return forkedFrom !== null && forkedFrom !== undefined && forkedFrom.sourceVisible;
}


export function forkSuccessBody(title: string): string {
  return `Your copy of "${title}" is saved to your trips. Open the workspace to make it yours.`;
}


export function forkSuccessMeta(trip: { destination: string; days: number }): string {
  const where = trip.destination.trim();
  const howLong = trip.days === 0 ? '' : `${trip.days} ${trip.days === 1 ? 'Day' : 'Days'}`;

  return [where, howLong].filter((part) => part !== '').join(' • ');
}


function authorMention(handle: string | null): string {
  const named = (handle ?? '').trim();
  return named === '' ? ANONYMOUS_AUTHOR : `@${named}`;
}


export const FORK_FAILED_TITLE = 'Could not fork this trip';

export const FORK_FAILED_BODY = 'Nothing was created. Check your connection and try again.';
