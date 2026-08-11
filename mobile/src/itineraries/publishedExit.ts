import { PROFILE_TAB_ROUTE } from '../navigation/authRoutes';


export type PublishedExit = 'trip' | 'profile';


export function publishedBackRoute(exit: PublishedExit): '/profile' | '/' {
  return exit === 'profile' ? PROFILE_TAB_ROUTE : '/';
}


export function publishedRoute(
  exit: PublishedExit,
  itineraryId: string,
):
  | { pathname: '/published/[id]'; params: { id: string } }
  | { pathname: '/showcase/[id]'; params: { id: string } } {
  return exit === 'profile'
    ? { pathname: '/showcase/[id]', params: { id: itineraryId } }
    : { pathname: '/published/[id]', params: { id: itineraryId } };
}
