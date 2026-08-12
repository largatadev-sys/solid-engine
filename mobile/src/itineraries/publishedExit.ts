import { HOME_TAB_ROUTE, PROFILE_TAB_ROUTE, TRIPS_TAB_ROUTE } from '../navigation/authRoutes';


export type PublishedExit = 'trip' | 'profile' | 'feed';


export function publishedBackRoute(exit: PublishedExit): '/profile' | '/trips' | '/' {
  if (exit === 'profile') return PROFILE_TAB_ROUTE;
  return exit === 'feed' ? HOME_TAB_ROUTE : TRIPS_TAB_ROUTE;
}


export function publishedRoute(
  exit: PublishedExit,
  itineraryId: string,
):
  | { pathname: '/published/[id]'; params: { id: string } }
  | { pathname: '/showcase/[id]'; params: { id: string } }
  | { pathname: '/feed/published/[id]'; params: { id: string } } {
  if (exit === 'profile') {
    return { pathname: '/showcase/[id]', params: { id: itineraryId } };
  }
  return exit === 'feed'
    ? { pathname: '/feed/published/[id]', params: { id: itineraryId } }
    : { pathname: '/published/[id]', params: { id: itineraryId } };
}
