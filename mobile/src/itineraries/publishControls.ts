import type { IconName } from '../components/Icon';
import type { ItineraryResponse, ItineraryState, PublishAudience, Visibility } from '../types/api';


export type PublishControl = 'publish' | 'unpublish';


type Axes = Pick<ItineraryResponse, 'state' | 'published' | 'visibility'>;


export function publishControl(
  itinerary: Pick<ItineraryResponse, 'published' | 'archived'>,
  isOwner: boolean,
): PublishControl | null {
  if (!isOwner || itinerary.archived) return null;
  return itinerary.published ? 'unpublish' : 'publish';
}


export function isPublished(itinerary: Pick<ItineraryResponse, 'published'>): boolean {
  return itinerary.published;
}


export function isEditable(itinerary: Pick<ItineraryResponse, 'published' | 'archived'>): boolean {
  return !itinerary.archived && !itinerary.published;
}


export function canPublish(itinerary: Pick<ItineraryResponse, 'state'>): boolean {
  return itinerary.state === 'completed';
}


export function audienceOf(itinerary: Pick<ItineraryResponse, 'visibility'>): PublishAudience {
  return itinerary.visibility;
}


export function otherAudience(audience: PublishAudience): PublishAudience {
  return audience === 'public' ? 'private' : 'public';
}


export type WorkspaceEyebrow = { icon: IconName; label: string };


const UNPUBLISHED_EYEBROWS: Record<ItineraryState, WorkspaceEyebrow> = {
  draft: { icon: 'users', label: 'Draft Workspace' },
  upcoming: { icon: 'users', label: 'Planning Finished' },
  ongoing: { icon: 'users', label: 'Trip Under Way' },
  completed: { icon: 'users', label: 'Trip Complete' },
};


const PUBLISHED_EYEBROWS: Record<Visibility, WorkspaceEyebrow> = {
  public: { icon: 'globe', label: 'Published — Public' },
  private: { icon: 'users', label: 'Published — Private' },
};


export function workspaceEyebrow(itinerary: Axes): WorkspaceEyebrow {
  return itinerary.published
    ? PUBLISHED_EYEBROWS[itinerary.visibility]
    : UNPUBLISHED_EYEBROWS[itinerary.state];
}


export function audienceLabel(audience: PublishAudience): string {
  return audience === 'public' ? 'Public' : 'Private';
}


export function audienceBlurb(audience: PublishAudience): string {
  return audience === 'public'
    ? 'Everyone on Largata can find and read this itinerary.'
    : 'Only you and your collaborators can read it.';
}


const LIFECYCLE_LABELS: Record<ItineraryState, string> = {
  draft: 'Draft — still being planned',
  upcoming: 'Upcoming — planning is finished',
  ongoing: 'Ongoing — the trip is under way',
  completed: 'Complete — the trip is done',
};


export function lifecycleLabel(state: ItineraryState): string {
  return LIFECYCLE_LABELS[state];
}


const LIFECYCLE_BLURBS: Record<ItineraryState, string> = {
  draft: 'Build the plan here. Finish planning when it is ready.',
  upcoming: 'The plan is set. Start the trip when you set off — you can still edit it until then.',
  ongoing: 'Mark it complete when you get back — a completed trip is the one you can publish.',
  completed: 'This trip is ready to publish whenever you want to share it.',
};


export function lifecycleBlurb(state: ItineraryState): string {
  return LIFECYCLE_BLURBS[state];
}


export type LifecycleAct = 'finish-planning' | 'start' | 'complete';

export type LifecycleStep = { act: LifecycleAct; label: string };


export function nextLifecycleAct(state: ItineraryState): LifecycleStep | null {
  if (state === 'draft') return { act: 'finish-planning', label: 'Finish Planning' };
  if (state === 'upcoming') return { act: 'start', label: 'Start trip' };
  if (state === 'ongoing') return { act: 'complete', label: 'Mark complete' };
  return null;
}


export const PUBLISH_NEEDS_COMPLETE_TITLE = 'This trip is not finished yet';


const NOT_COMPLETE_WHERE: Record<Exclude<ItineraryState, 'completed'>, string> = {
  draft: 'still a draft',
  upcoming: 'planned but not travelled yet',
  ongoing: 'under way',
};


export function publishNeedsCompleteBody(state: ItineraryState): string {
  const where = state === 'completed' ? 'complete' : NOT_COMPLETE_WHERE[state];
  return `Only a completed trip can be published, because a published itinerary is a record of a trip that happened. This one is ${where} — mark it complete first, and you can publish it after.`;
}
