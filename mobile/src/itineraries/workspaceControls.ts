import { workspaceBadgeColors } from '../theme/workspaceTokens';
import type { ItineraryResponse, ItineraryState, LeaseHolderResponse } from '../types/api';
import { holderLabel } from './leaseIndicator';


export type WorkspaceSurface = 'viewer' | 'editor';

export type StateBadge = { label: string; background: string; foreground: string; border: string };

export type LadderAct = 'start' | 'complete' | 'publish';

export type LadderCta = { act: LadderAct; label: string; blockedBy?: string };

export type ForwardConfirmWording = {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
};

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


const BADGE_LABELS: Record<ItineraryState, string> = {
  upcoming: 'Upcoming',
  ongoing: 'Ongoing',
  completed: 'Completed',
};


const LADDER: Record<ItineraryState, LadderCta> = {
  upcoming: { act: 'start', label: 'Start Trip' },
  ongoing: { act: 'complete', label: 'Complete Trip' },
  completed: { act: 'publish', label: 'Publish Itinerary' },
};


const FORWARD_CONFIRM: Record<LadderAct, ForwardConfirmWording | null> = {
  start: {
    title: 'Start this trip?',
    body: 'Postcards open for every member once the trip starts.',
    confirmLabel: 'Start Trip',
    cancelLabel: 'Not yet',
  },
  complete: {
    title: 'Complete this trip?',
    body: 'Marks the trip as travelled — a completed trip can be published.',
    confirmLabel: 'Complete Trip',
    cancelLabel: 'Still travelling',
  },
  publish: null,
};


export function stateBadge(
  itinerary: Pick<ItineraryResponse, 'state'>,
  surface: WorkspaceSurface = 'viewer',
): StateBadge {
  return {
    label: surface === 'editor' ? 'Trip Workspace' : BADGE_LABELS[itinerary.state],
    ...workspaceBadgeColors.lifecycle,
  };
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

  const session = itinerary.editingSession;
  return session && session.travelerId !== viewerTravelerId
    ? { ...rung, blockedBy: holderLabel(session) }
    : rung;
}


export function forwardConfirmWording(act: LadderAct): ForwardConfirmWording | null {
  return FORWARD_CONFIRM[act];
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
