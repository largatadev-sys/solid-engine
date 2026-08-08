import { workspaceBadgeColors } from '../theme/workspaceTokens';
import type { ItineraryResponse, ItineraryState, LeaseHolderResponse } from '../types/api';
import { holderLabel } from './leaseIndicator';


export type WorkspaceSurface = 'viewer' | 'editor';

export type StateBadge = { label: string; background: string; foreground: string };

export type LadderAct = 'start' | 'complete' | 'publish';

export type LadderCta = { act: LadderAct; label: string };

export type EditItineraryAction =
  | { kind: 'edit' }
  | { kind: 'reopen-then-edit' }
  | { kind: 'blocked'; holder: string }
  | { kind: 'hidden' };

export type WorkspaceAffordances = {
  showsDragHandles: boolean;
  showsActivityEditing: boolean;
  showsAddDay: boolean;
  showsDayDelete: boolean;
  showsFinalize: boolean;
};


const BADGES: Record<ItineraryState, StateBadge> = {
  draft: { label: 'Draft', ...workspaceBadgeColors.draft },
  upcoming: { label: 'Ready', ...workspaceBadgeColors.upcoming },
  ongoing: { label: 'Ongoing', ...workspaceBadgeColors.ongoing },
  completed: { label: 'Completed', ...workspaceBadgeColors.completed },
};


const LADDER: Record<ItineraryState, LadderCta | null> = {
  draft: null,
  upcoming: { act: 'start', label: 'Start Trip' },
  ongoing: { act: 'complete', label: 'Complete Trip' },
  completed: { act: 'publish', label: 'Publish Itinerary' },
};


export function stateBadge(
  itinerary: Pick<ItineraryResponse, 'state'>,
  surface: WorkspaceSurface = 'viewer',
): StateBadge {
  const badge = BADGES[itinerary.state];
  return surface === 'editor' && itinerary.state === 'draft'
    ? { ...badge, label: 'Draft TRIP Workspace' }
    : badge;
}


export function ladderCta(
  itinerary: Pick<ItineraryResponse, 'state' | 'archived' | 'published'>,
  isOwner: boolean,
): LadderCta | null {
  if (!isOwner || itinerary.archived || itinerary.published) return null;
  return LADDER[itinerary.state];
}


export function showsStepBack(
  itinerary: Pick<ItineraryResponse, 'state' | 'archived' | 'published'>,
  isOwner: boolean,
): boolean {
  if (!isOwner || itinerary.archived || itinerary.published) return false;
  return itinerary.state === 'ongoing' || itinerary.state === 'completed';
}


export function editItineraryAction(
  itinerary: Pick<ItineraryResponse, 'state' | 'archived' | 'published'> & {
    editingSession?: LeaseHolderResponse | null;
  },
  canEditPlan: boolean,
  viewerTravelerId?: string,
): EditItineraryAction {
  if (!canEditPlan || itinerary.archived || itinerary.published) return { kind: 'hidden' };

  const session = itinerary.editingSession;
  if (session && session.travelerId !== viewerTravelerId) {
    return { kind: 'blocked', holder: holderLabel(session) };
  }

  return itinerary.state === 'draft' ? { kind: 'edit' } : { kind: 'reopen-then-edit' };
}


export function workspaceAffordances(
  surface: WorkspaceSurface,
  isOwner: boolean,
): WorkspaceAffordances {
  const editing = surface === 'editor';
  return {
    showsDragHandles: editing,
    showsActivityEditing: editing,
    showsAddDay: editing && isOwner,
    showsDayDelete: editing && isOwner,
    showsFinalize: editing && isOwner,
  };
}
