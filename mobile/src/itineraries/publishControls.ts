import type { IconName } from '../components/Icon';
import type { ItineraryResponse, Visibility } from '../types/api';


export type PublishControl = 'publish' | 'unpublish';


export function publishControl(
  itinerary: Pick<ItineraryResponse, 'visibility' | 'archived'>,
  isOwner: boolean,
): PublishControl | null {
  if (!isOwner || itinerary.archived) return null;
  return itinerary.visibility === 'published' ? 'unpublish' : 'publish';
}


export function isPublished(itinerary: Pick<ItineraryResponse, 'visibility'>): boolean {
  return itinerary.visibility === 'published';
}


export type WorkspaceEyebrow = { icon: IconName; label: string };


export function workspaceEyebrow(visibility: Visibility): WorkspaceEyebrow {
  return visibility === 'published'
    ? { icon: 'globe', label: 'Published Itinerary' }
    : { icon: 'users', label: 'Private Workspace' };
}
