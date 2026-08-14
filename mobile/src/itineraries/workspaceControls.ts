import type { ConfirmWording } from '../components/confirmDestructiveMessage';
import { workspaceBadgeColors } from '../theme/workspaceTokens';
import type { ItineraryResponse, ItineraryState, LeaseHolderResponse } from '../types/api';
import { holderLabel } from './leaseIndicator';


export type WorkspaceSurface = 'viewer' | 'editor';

export type StateBadge = { label: string; background: string; foreground: string };

export type LadderAct = 'finish-planning' | 'start' | 'complete' | 'publish';

export type LadderCta = { act: LadderAct; label: string; blockedBy?: string };

export type EditItineraryAction =
  | { kind: 'edit' }
  | { kind: 'blocked'; holder: string }
  | { kind: 'hidden' };

export type WorkspaceAffordances = {
  showsDragHandles: boolean;
  showsActivityEditing: boolean;
  showsAddDay: boolean;
  showsDayDelete: boolean;
  showsDayRename: boolean;
};


const BADGES: Record<ItineraryState, StateBadge> = {
  draft: { label: 'Draft', ...workspaceBadgeColors.draft },
  upcoming: { label: 'Ready', ...workspaceBadgeColors.upcoming },
  ongoing: { label: 'Active', ...workspaceBadgeColors.ongoing },
  completed: { label: 'Completed', ...workspaceBadgeColors.completed },
};


const LADDER: Record<ItineraryState, LadderCta | null> = {
  draft: { act: 'finish-planning', label: 'Finalize Itinerary' },
  upcoming: { act: 'start', label: 'Start Trip' },
  ongoing: { act: 'complete', label: 'Complete Trip' },
  completed: { act: 'publish', label: 'Publish Itinerary' },
};


export function stateBadge(
  itinerary: Pick<ItineraryResponse, 'state'>,
  surface: WorkspaceSurface = 'viewer',
): StateBadge {
  const badge = BADGES[itinerary.state];
  return surface === 'editor' ? { ...badge, label: 'Trip Workspace' } : badge;
}


export function ladderCta(
  itinerary: Pick<ItineraryResponse, 'state' | 'archived' | 'published'> & {
    editingSession?: LeaseHolderResponse | null;
  },
  isOwner: boolean,
  viewerTravelerId?: string,
): LadderCta | null {
  if (!isOwner || itinerary.archived || itinerary.published) return null;

  const rung = LADDER[itinerary.state];
  if (rung === null) return null;

  const session = itinerary.editingSession;
  return session && session.travelerId !== viewerTravelerId
    ? { ...rung, blockedBy: holderLabel(session) }
    : rung;
}


export function showsStepBack(
  itinerary: Pick<ItineraryResponse, 'state' | 'archived' | 'published'>,
  isOwner: boolean,
): boolean {
  if (!isOwner || itinerary.archived || itinerary.published) return false;
  return itinerary.state !== 'draft';
}


const STEP_BACK_WORDING: Record<ItineraryState, ConfirmWording | null> = {
  draft: null,
  upcoming: {
    title: 'Reopen planning?',
    body: 'The trip goes back to Draft. Editing the plan never needs this — you can do that from Edit Itinerary at any time.',
    confirmLabel: 'Reopen planning',
  },
  ongoing: {
    title: 'Undo starting the trip?',
    body: 'The trip goes back to Ready, and nobody can add postcards until you start it again.',
    confirmLabel: 'Step back',
  },
  completed: {
    title: 'Undo completing the trip?',
    body: 'The trip goes back to Active. You can complete it again at any time.',
    confirmLabel: 'Step back',
  },
};


export function stepBackWording(itinerary: Pick<ItineraryResponse, 'state'>): ConfirmWording | null {
  return STEP_BACK_WORDING[itinerary.state];
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

  return { kind: 'edit' };
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
    showsDayRename: editing,
  };
}
