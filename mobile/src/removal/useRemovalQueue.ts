import { useCallback, useEffect, useRef, useState } from 'react';
import type { RemovalSubject } from './RemovalSheet';
import {
  cancelled,
  commit,
  emptyUndoQueue,
  expired,
  isPending,
  pendingIds,
  requested,
  type RemovalRef,
  type RemovalRequest,
  type UndoQueue,
} from './undoQueue';


export interface RemovalQueue {
  readonly queue: UndoQueue;
  readonly removedIds: readonly string[];
  readonly isRemoved: (subjectId: string) => boolean;
  readonly request: (removal: RemovalRequest) => void;
  readonly undo: (token: number) => void;
  readonly settle: (token: number) => void;
  readonly subject: RemovalSubject | null;
  readonly lastSubject: RemovalSubject | null;
  readonly openMenu: (subject: RemovalSubject) => void;
  readonly closeMenu: () => void;
}


export function useRemovalQueue(
  onCommit: (ref: RemovalRef) => void,
  onRevert?: (ref: RemovalRef) => void,
): RemovalQueue {
  const [queue, setQueue] = useState(emptyUndoQueue);
  const [subject, setSubject] = useState<RemovalSubject | null>(null);
  const [lastSubject, setLastSubject] = useState<RemovalSubject | null>(null);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;
  const revertRef = useRef(onRevert);
  revertRef.current = onRevert;

  const held = useRef(queue);
  held.current = queue;

  useEffect(
    () => () => {
      for (const ref of commit(held.current).commits) commitRef.current(ref);
    },
    [],
  );

  const apply = useCallback(
    (step: { queue: UndoQueue; commits: readonly RemovalRef[]; reverts: readonly RemovalRef[] }) => {
      setQueue(step.queue);
      for (const ref of step.commits) commitRef.current(ref);
      for (const ref of step.reverts) revertRef.current?.(ref);
    },
    [],
  );

  const request = useCallback(
    (removal: RemovalRequest) => apply(requested(held.current, removal)),
    [apply],
  );

  const undo = useCallback((token: number) => apply(cancelled(held.current, token)), [apply]);

  const settle = useCallback((token: number) => apply(expired(held.current, token)), [apply]);

  const openMenu = useCallback((next: RemovalSubject) => {
    setSubject(next);
    setLastSubject(next);
  }, []);

  const closeMenu = useCallback(() => setSubject(null), []);

  return {
    queue,
    removedIds: pendingIds(queue),
    isRemoved: (subjectId: string) => isPending(queue, subjectId),
    request,
    undo,
    settle,
    subject,
    lastSubject,
    openMenu,
    closeMenu,
  };
}
