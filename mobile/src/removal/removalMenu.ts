import type { IconName } from '../components/Icon';
import {
  COPY_PUBLIC_LINK_LABEL,
  DELETE_POSTCARD_LABEL,
  EDIT_DIARY_DETAILS_LABEL,
  EDIT_ITINERARY_DETAILS_LABEL,
  EDIT_POSTCARD_LABEL,
  UNPUBLISH_LABEL,
  VIEW_PUBLISHED_PAGE_LABEL,
} from './removalCopy';


export type RemovalSubjectKind = 'postcard' | 'diary' | 'itinerary';

export type RemovalMenuTone = 'default' | 'destructive' | 'cautionary';

export type RemovalMenuKey =
  | 'editPostcard'
  | 'deletePostcard'
  | 'editDiaryDetails'
  | 'copyPublicLink'
  | 'editItineraryDetails'
  | 'viewPublishedPage'
  | 'unpublish';


export interface RemovalMenuEntry {
  readonly key: RemovalMenuKey;
  readonly label: string;
  readonly tone: RemovalMenuTone;
  readonly icon: IconName;
}


const MENUS: Record<RemovalSubjectKind, readonly RemovalMenuEntry[]> = {
  postcard: [
    { key: 'editPostcard', label: EDIT_POSTCARD_LABEL, tone: 'default', icon: 'pencil' },
    { key: 'deletePostcard', label: DELETE_POSTCARD_LABEL, tone: 'destructive', icon: 'trash' },
  ],
  diary: [
    { key: 'editDiaryDetails', label: EDIT_DIARY_DETAILS_LABEL, tone: 'default', icon: 'pencil' },
    { key: 'copyPublicLink', label: COPY_PUBLIC_LINK_LABEL, tone: 'default', icon: 'link' },
  ],
  itinerary: [
    {
      key: 'editItineraryDetails',
      label: EDIT_ITINERARY_DETAILS_LABEL,
      tone: 'default',
      icon: 'pencil',
    },
    { key: 'viewPublishedPage', label: VIEW_PUBLISHED_PAGE_LABEL, tone: 'default', icon: 'eye' },
    { key: 'unpublish', label: UNPUBLISH_LABEL, tone: 'cautionary', icon: 'close' },
  ],
};


export function removalMenuEntries(kind: RemovalSubjectKind): readonly RemovalMenuEntry[] {
  return MENUS[kind];
}
