import { PROFILE_TAB_ROUTE } from '../navigation/authRoutes';


export type DiaryEntryExit = 'trip' | 'profile';


export function afterSaveRoute(
  exit: DiaryEntryExit,
  itineraryId: string,
  activityTitle: string,
):
  | { pathname: '/itineraries/[id]/diary/posted'; params: { id: string; title: string; saved: string } }
  | { pathname: '/profile' } {
  return exit === 'profile'
    ? { pathname: PROFILE_TAB_ROUTE }
    : {
        pathname: '/itineraries/[id]/diary/posted',
        params: { id: itineraryId, title: activityTitle, saved: 'true' },
      };
}


export function afterDeleteRoute(
  exit: DiaryEntryExit,
  itineraryId: string,
): { pathname: '/itineraries/[id]'; params: { id: string } } | { pathname: '/profile' } {
  return exit === 'profile'
    ? { pathname: PROFILE_TAB_ROUTE }
    : { pathname: '/itineraries/[id]', params: { id: itineraryId } };
}
