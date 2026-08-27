import type { ComingSoonSurface } from '../components/comingSoonMessage';
import type { RemovalMenuKey } from './removalMenu';


export type RemovalAction =
  | { readonly kind: 'editPostcard' }
  | { readonly kind: 'viewPublished' }
  | { readonly kind: 'editItineraryDetails' }
  | { readonly kind: 'delete' }
  | { readonly kind: 'unpublish' }
  | { readonly kind: 'comingSoon'; readonly surface: ComingSoonSurface };


export function removalActionFor(entry: RemovalMenuKey): RemovalAction {
  switch (entry) {
    case 'editPostcard':
      return { kind: 'editPostcard' };
    case 'deletePostcard':
      return { kind: 'delete' };
    case 'viewPublishedPage':
      return { kind: 'viewPublished' };
    case 'editItineraryDetails':
      return { kind: 'editItineraryDetails' };
    case 'unpublish':
      return { kind: 'unpublish' };
    case 'editDiaryDetails':
    case 'copyPublicLink':
      return { kind: 'comingSoon', surface: 'diary' };
  }
}
