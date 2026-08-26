import { PROFILE_TAB_ROUTE } from '../navigation/authRoutes';

export const PUBLIC_PROFILE_PATHNAME = '/travelers/[handle]';

export const PEOPLE_RESULTS_PATHNAME = '/discovery-people';


export type TravelerDestination =
  | { readonly kind: 'own' }
  | { readonly kind: 'public'; readonly handle: string }
  | { readonly kind: 'nowhere' };


export function travelerDestination(
  subjectHandle: string | null | undefined,
  viewerHandle: string | null | undefined,
): TravelerDestination {
  const subject = normalizeHandle(subjectHandle);
  if (subject === null) {
    return { kind: 'nowhere' };
  }
  if (subject === normalizeHandle(viewerHandle)) {
    return { kind: 'own' };
  }
  return { kind: 'public', handle: subject };
}


export function publicProfileRoute(handle: string): {
  pathname: typeof PUBLIC_PROFILE_PATHNAME;
  params: { handle: string };
} {
  return { pathname: PUBLIC_PROFILE_PATHNAME, params: { handle } };
}


export function ownProfileRoute(): typeof PROFILE_TAB_ROUTE {
  return PROFILE_TAB_ROUTE;
}


export function peopleResultsRoute(query: string): {
  pathname: typeof PEOPLE_RESULTS_PATHNAME;
  params: { q: string };
} {
  return { pathname: PEOPLE_RESULTS_PATHNAME, params: { q: query } };
}


function normalizeHandle(handle: string | null | undefined): string | null {
  const trimmed = (handle ?? '').trim().toLowerCase();
  return trimmed === '' ? null : trimmed;
}
