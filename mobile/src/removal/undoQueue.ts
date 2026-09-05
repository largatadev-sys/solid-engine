import {
  BACK_IN_TRIP_TOAST,
  ITINERARY_REPUBLISHED_TOAST,
  POSTCARD_RESTORED_TOAST,
  REPUBLISH_LABEL,
  UNDO_LABEL,
} from './removalCopy';


export const UNDO_MS = 5000;

export const PLAIN_HOLD_MS = 1600;

export const DRAIN_LEAD_MS = 160;

export const DRAIN_MS = UNDO_MS - DRAIN_LEAD_MS;


export type RemovalKind = 'deletePostcard' | 'leaveTrip' | 'unpublish' | 'deleteTrip';


export interface Removal {
  readonly subjectId: string;
  readonly kind: RemovalKind;
  readonly token: number;
  readonly deferred: boolean;
  readonly itineraryId: string | null;
}


export interface UndoToast {
  readonly token: number;
  readonly message: string;
  readonly undoable: boolean;
  readonly undoLabel: string;
  readonly holdMs: number;
}


export interface UndoQueue {
  readonly pending: Removal | null;
  readonly toast: UndoToast | null;
  readonly nextToken: number;
}


export interface RemovalRef {
  readonly subjectId: string;
  readonly kind: RemovalKind;
  readonly itineraryId: string | null;
}


function refOf(removal: Removal): RemovalRef {
  return {
    subjectId: removal.subjectId,
    kind: removal.kind,
    itineraryId: removal.itineraryId,
  };
}


export interface UndoStep {
  readonly queue: UndoQueue;
  readonly commits: readonly RemovalRef[];
  readonly reverts: readonly RemovalRef[];
}


export interface RemovalRequest {
  readonly subjectId: string;
  readonly kind: RemovalKind;
  readonly message: string;
  readonly deferred?: boolean;
  readonly undoable?: boolean;
  readonly undoLabel?: string;
  readonly itineraryId?: string;
}


const RESTORED_MESSAGE: Record<RemovalKind, string | null> = {
  deletePostcard: POSTCARD_RESTORED_TOAST,
  leaveTrip: BACK_IN_TRIP_TOAST,
  unpublish: ITINERARY_REPUBLISHED_TOAST,
  deleteTrip: null,
};


export function emptyUndoQueue(): UndoQueue {
  return { pending: null, toast: null, nextToken: 1 };
}


export function isPending(queue: UndoQueue, subjectId: string): boolean {
  return queue.pending !== null && queue.pending.subjectId === subjectId;
}


export function pendingIds(queue: UndoQueue): string[] {
  return queue.pending === null ? [] : [queue.pending.subjectId];
}


export function requested(queue: UndoQueue, request: RemovalRequest): UndoStep {
  const superseded = commit(queue);
  const token = queue.nextToken;
  const undoable = request.undoable ?? true;
  const deferred = request.deferred ?? true;

  const toast: UndoToast = {
    token,
    message: request.message,
    undoable,
    undoLabel: request.undoLabel ?? (request.kind === 'unpublish' ? REPUBLISH_LABEL : UNDO_LABEL),
    holdMs: undoable ? UNDO_MS : PLAIN_HOLD_MS,
  };

  return {
    queue: {
      pending: undoable
        ? {
            subjectId: request.subjectId,
            kind: request.kind,
            token,
            deferred,
            itineraryId: request.itineraryId ?? null,
          }
        : null,
      toast,
      nextToken: token + 1,
    },
    commits: superseded.commits,
    reverts: [],
  };
}


export function cancelled(queue: UndoQueue, token: number): UndoStep {
  const held = queue.pending;
  if (held === null || held.token !== token) {
    return { queue, commits: [], reverts: [] };
  }

  const message = RESTORED_MESSAGE[held.kind];

  return {
    queue: {
      pending: null,
      toast:
        message === null
          ? null
          : {
              token: queue.nextToken,
              message,
              undoable: false,
              undoLabel: UNDO_LABEL,
              holdMs: PLAIN_HOLD_MS,
            },
      nextToken: queue.nextToken + 1,
    },
    commits: [],
    reverts: held.deferred ? [] : [refOf(held)],
  };
}


export function expired(queue: UndoQueue, token: number): UndoStep {
  const held = queue.pending;
  if (held !== null && held.token !== token) {
    return { queue, commits: [], reverts: [] };
  }
  if (queue.toast !== null && queue.toast.token !== token) {
    return { queue, commits: [], reverts: [] };
  }

  const drained = commit(queue);
  return { queue: { ...drained.queue, toast: null }, commits: drained.commits, reverts: [] };
}


export function commit(queue: UndoQueue): UndoStep {
  const held = queue.pending;
  if (held === null) {
    return { queue, commits: [], reverts: [] };
  }

  return {
    queue: { ...queue, pending: null },
    commits: held.deferred ? [refOf(held)] : [],
    reverts: [],
  };
}
