import {
  UNDO_MS,
  cancelled,
  commit,
  emptyUndoQueue,
  expired,
  isPending,
  pendingIds,
  requested,
  type UndoQueue,
} from '../src/removal/undoQueue';


const DELETE_POSTCARD = { kind: 'deletePostcard', message: 'Postcard deleted' } as const;

function request(queue: UndoQueue, id: string) {
  return requested(queue, { subjectId: id, ...DELETE_POSTCARD });
}


describe('the undo queue holds one deferred removal at a time', () => {
  it('starts empty, with nothing pending and no toast', () => {
    const queue = emptyUndoQueue();

    expect(queue.pending).toBeNull();
    expect(queue.toast).toBeNull();
    expect(pendingIds(queue)).toEqual([]);
  });

  it('holds the subject and raises its toast when a removal is requested', () => {
    const { queue, commits } = request(emptyUndoQueue(), 'card-1');

    expect(commits).toEqual([]);
    expect(queue.pending?.subjectId).toBe('card-1');
    expect(queue.toast?.message).toBe('Postcard deleted');
    expect(queue.toast?.undoable).toBe(true);
    expect(isPending(queue, 'card-1')).toBe(true);
  });

  it('gives every request a fresh monotonic token', () => {
    const first = request(emptyUndoQueue(), 'card-1');
    const second = request(first.queue, 'card-2');

    expect(second.queue.pending?.token).toBeGreaterThan(first.queue.pending!.token);
  });

  it('holds the removal for the undo window, not a hold', () => {
    const { queue } = request(emptyUndoQueue(), 'card-1');

    expect(queue.toast?.holdMs).toBe(UNDO_MS);
  });
});


describe('undo means the call is never sent', () => {
  it('drops the pending removal and reports nothing to commit', () => {
    const { queue } = request(emptyUndoQueue(), 'card-1');
    const undone = cancelled(queue, queue.pending!.token);

    expect(undone.commits).toEqual([]);
    expect(undone.queue.pending).toBeNull();
    expect(isPending(undone.queue, 'card-1')).toBe(false);
  });

  it('raises the restored toast, which carries no undo of its own', () => {
    const { queue } = request(emptyUndoQueue(), 'card-1');
    const undone = cancelled(queue, queue.pending!.token);

    expect(undone.queue.toast?.message).toBe('Postcard restored');
    expect(undone.queue.toast?.undoable).toBe(false);
  });

  it('ignores an undo carrying a stale token', () => {
    const { queue } = request(emptyUndoQueue(), 'card-1');
    const stale = cancelled(queue, queue.pending!.token - 1);

    expect(stale.queue.pending?.subjectId).toBe('card-1');
    expect(stale.queue.toast?.message).toBe('Postcard deleted');
  });
});


describe('expiry is the commit point', () => {
  it('emits exactly one commit for the pending removal and clears it', () => {
    const { queue } = request(emptyUndoQueue(), 'card-1');
    const done = expired(queue, queue.pending!.token);

    expect(done.commits).toMatchObject([{ subjectId: 'card-1', kind: 'deletePostcard' }]);
    expect(done.queue.pending).toBeNull();
    expect(done.queue.toast).toBeNull();
  });

  it('ignores an expiry carrying a stale token, so a superseded timer commits nothing twice', () => {
    const { queue } = request(emptyUndoQueue(), 'card-1');
    const stale = expired(queue, queue.pending!.token - 1);

    expect(stale.commits).toEqual([]);
    expect(stale.queue.pending?.subjectId).toBe('card-1');
  });
});


describe('a newer removal supersedes the older one, committing it first', () => {
  it('commits the older removal and holds only the newer', () => {
    const first = request(emptyUndoQueue(), 'card-1');
    const second = request(first.queue, 'card-2');

    expect(second.commits).toMatchObject([{ subjectId: 'card-1', kind: 'deletePostcard' }]);
    expect(second.queue.pending?.subjectId).toBe('card-2');
    expect(isPending(second.queue, 'card-1')).toBe(false);
    expect(isPending(second.queue, 'card-2')).toBe(true);
  });

  it('replaces the toast rather than stacking a second one', () => {
    const first = request(emptyUndoQueue(), 'card-1');
    const second = request(first.queue, 'card-2');

    expect(second.queue.toast?.message).toBe('Postcard deleted');
    expect(second.queue.toast?.token).toBe(second.queue.pending?.token);
  });

  it('leaves the older removal committed even when the newer one is undone', () => {
    const first = request(emptyUndoQueue(), 'card-1');
    const second = request(first.queue, 'card-2');
    const undone = cancelled(second.queue, second.queue.pending!.token);

    expect(undone.commits).toEqual([]);
    expect(isPending(undone.queue, 'card-1')).toBe(false);
    expect(isPending(undone.queue, 'card-2')).toBe(false);
  });
});


describe('the removal carries what committing it needs, so nothing is looked up again later', () => {
  it('hands the itinerary back on commit, so the delete knows where the postcard lived', () => {
    const { queue } = requested(emptyUndoQueue(), {
      subjectId: 'card-1',
      kind: 'deletePostcard',
      message: 'Postcard deleted',
      itineraryId: 'trip-77',
    });
    const done = expired(queue, queue.pending!.token);

    expect(done.commits[0]?.itineraryId).toBe('trip-77');
  });

  it('hands the audience back on undo, so republish restores what the trip had', () => {
    const { queue } = requested(emptyUndoQueue(), {
      subjectId: 'trip-1',
      kind: 'unpublish',
      message: 'Itinerary unpublished',
      deferred: false,
      audience: 'public',
    });
    const undone = cancelled(queue, queue.pending!.token);

    expect(undone.reverts[0]?.audience).toBe('public');
  });

  it('reports null rather than guessing when the request carried neither', () => {
    const { queue } = request(emptyUndoQueue(), 'card-1');
    const done = expired(queue, queue.pending!.token);

    expect(done.commits[0]?.itineraryId).toBeNull();
    expect(done.commits[0]?.audience).toBeNull();
  });
});


describe('commit drains whatever is still held, so a screen leaving loses nothing', () => {
  it('emits the pending removal and empties the queue', () => {
    const { queue } = request(emptyUndoQueue(), 'card-1');
    const drained = commit(queue);

    expect(drained.commits).toMatchObject([{ subjectId: 'card-1', kind: 'deletePostcard' }]);
    expect(drained.queue.pending).toBeNull();
  });

  it('is a no-op on an empty queue', () => {
    const drained = commit(emptyUndoQueue());

    expect(drained.commits).toEqual([]);
    expect(drained.queue.pending).toBeNull();
  });
});


describe('server-undo removals are never deferred', () => {
  it('carries no pending commit, because the call already went out', () => {
    const { queue, commits } = requested(emptyUndoQueue(), {
      subjectId: 'trip-1',
      kind: 'unpublish',
      message: 'Itinerary unpublished',
      deferred: false,
    });

    expect(commits).toEqual([]);
    expect(queue.pending?.deferred).toBe(false);
    expect(queue.toast?.undoLabel).toBe('Republish');
  });

  it('reports the inverse to run when undone, rather than simply dropping it', () => {
    const { queue } = requested(emptyUndoQueue(), {
      subjectId: 'trip-1',
      kind: 'unpublish',
      message: 'Itinerary unpublished',
      deferred: false,
    });
    const undone = cancelled(queue, queue.pending!.token);

    expect(undone.reverts).toMatchObject([{ subjectId: 'trip-1', kind: 'unpublish' }]);
    expect(undone.queue.toast?.message).toBe('Itinerary republished');
  });

  it('emits nothing on expiry, because the server already holds the truth', () => {
    const { queue } = requested(emptyUndoQueue(), {
      subjectId: 'trip-1',
      kind: 'unpublish',
      message: 'Itinerary unpublished',
      deferred: false,
    });
    const done = expired(queue, queue.pending!.token);

    expect(done.commits).toEqual([]);
    expect(done.queue.pending).toBeNull();
  });

  it('does not commit a superseded server-undo removal, only clears it', () => {
    const first = requested(emptyUndoQueue(), {
      subjectId: 'trip-1',
      kind: 'unpublish',
      message: 'Itinerary unpublished',
      deferred: false,
    });
    const second = request(first.queue, 'card-2');

    expect(second.commits).toEqual([]);
    expect(second.queue.pending?.subjectId).toBe('card-2');
  });
});


describe('a plain toast carries no undo and supersedes a pending removal', () => {
  it('commits what was held and shows the plain message', () => {
    const { queue } = request(emptyUndoQueue(), 'card-1');
    const plain = requested(queue, {
      subjectId: 'trip-9',
      kind: 'deleteTrip',
      message: 'Trip deleted',
      undoable: false,
    });

    expect(plain.commits).toMatchObject([{ subjectId: 'card-1', kind: 'deletePostcard' }]);
    expect(plain.queue.toast?.message).toBe('Trip deleted');
    expect(plain.queue.toast?.undoable).toBe(false);
    expect(plain.queue.pending).toBeNull();
  });
});
