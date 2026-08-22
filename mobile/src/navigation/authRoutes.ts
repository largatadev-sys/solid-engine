export const WELCOME_ROUTE = '/welcome';
export const SIGNED_IN_HOME = '/';

export const HOME_TAB_ROUTE = '/';

export const TRIPS_TAB_ROUTE = '/trips';

export const PROFILE_TAB_ROUTE = '/profile';

const PUBLIC_SEGMENTS = ['welcome', 'sign-up', 'sign-in'] as const;

export const JOIN_SEGMENT = 'join';

export function isPublicRoute(segment: string | undefined): boolean {
  return PUBLIC_SEGMENTS.some((route) => route === segment);
}


export function isJoinRoute(segment: string | undefined): boolean {
  return segment === JOIN_SEGMENT;
}

export function landingRouteFor(
  kind: 'signedIn' | 'signedOut',
  segment: string | undefined,
): string | null {
  const onPublicRoute = isPublicRoute(segment);

  if (kind === 'signedOut') return onPublicRoute ? null : WELCOME_ROUTE;

  return onPublicRoute ? SIGNED_IN_HOME : null;
}
