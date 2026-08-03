import type { IconName } from '../components/Icon';
import type { ItineraryResponse, ItineraryStatus, PublishAudience } from '../types/api';


export type PublishControl = 'publish' | 'unpublish';


export function publishControl(
  itinerary: Pick<ItineraryResponse, 'status' | 'archived'>,
  isOwner: boolean,
): PublishControl | null {
  if (!isOwner || itinerary.archived) return null;
  return itinerary.status === 'draft' ? 'publish' : 'unpublish';
}


export function isPublished(itinerary: Pick<ItineraryResponse, 'status'>): boolean {
  return itinerary.status !== 'draft';
}


export function isEditable(itinerary: Pick<ItineraryResponse, 'status' | 'archived'>): boolean {
  return !itinerary.archived && itinerary.status === 'draft';
}


export function audienceOf(itinerary: Pick<ItineraryResponse, 'status'>): PublishAudience | null {
  return itinerary.status === 'draft' ? null : itinerary.status;
}


export function otherAudience(audience: PublishAudience): PublishAudience {
  return audience === 'public' ? 'private' : 'public';
}


export type WorkspaceEyebrow = { icon: IconName; label: string };


const EYEBROWS: Record<ItineraryStatus, WorkspaceEyebrow> = {
  draft: { icon: 'users', label: 'Draft Workspace' },
  private: { icon: 'users', label: 'Published — Private' },
  public: { icon: 'globe', label: 'Published — Public' },
};


export function workspaceEyebrow(status: ItineraryStatus): WorkspaceEyebrow {
  return EYEBROWS[status];
}


export function audienceLabel(audience: PublishAudience): string {
  return audience === 'public' ? 'Public' : 'Private';
}


export function audienceBlurb(audience: PublishAudience): string {
  return audience === 'public'
    ? 'Everyone on Largata can find and read this itinerary.'
    : 'Only you and your collaborators can read it.';
}
