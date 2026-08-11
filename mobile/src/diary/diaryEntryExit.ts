import { PROFILE_TAB_ROUTE } from '../navigation/authRoutes';


export type DiaryEntryExit = 'trip' | 'profile' | 'tripDiary';


export function afterSaveRoute(
  exit: DiaryEntryExit,
  itineraryId: string,
  activityTitle: string,
):
  | { pathname: '/itineraries/[id]/diary/posted'; params: { id: string; title: string; saved: string } }
  | { pathname: '/diary/[id]'; params: { id: string } }
  | { pathname: '/profile' } {
  if (exit === 'tripDiary') return { pathname: '/diary/[id]', params: { id: itineraryId } };
  return exit === 'profile'
    ? { pathname: PROFILE_TAB_ROUTE }
    : {
        pathname: '/itineraries/[id]/diary/posted',
        params: { id: itineraryId, title: activityTitle, saved: 'true' },
      };
}


export function profileStackExit(from: string | undefined): DiaryEntryExit {
  return from === 'tripDiary' ? 'tripDiary' : 'profile';
}


export function entryEditorRoute(
  exit: DiaryEntryExit,
  itineraryId: string,
  entryId: string,
):
  | { pathname: '/itineraries/[id]/diary/[entryId]'; params: { id: string; entryId: string } }
  | {
      pathname: '/diary/[id]/[entryId]';
      params: { id: string; entryId: string; from: DiaryEntryExit };
    } {
  return exit === 'trip'
    ? { pathname: '/itineraries/[id]/diary/[entryId]', params: { id: itineraryId, entryId } }
    : { pathname: '/diary/[id]/[entryId]', params: { id: itineraryId, entryId, from: exit } };
}


export function afterDeleteRoute(
  exit: DiaryEntryExit,
  itineraryId: string,
):
  | { pathname: '/itineraries/[id]'; params: { id: string } }
  | { pathname: '/diary/[id]'; params: { id: string } }
  | { pathname: '/profile' } {
  if (exit === 'tripDiary') return { pathname: '/diary/[id]', params: { id: itineraryId } };
  return exit === 'profile'
    ? { pathname: PROFILE_TAB_ROUTE }
    : { pathname: '/itineraries/[id]', params: { id: itineraryId } };
}
