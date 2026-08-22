import {
  LEAVE_TRIP_LABEL,
  REMOVE_FROM_TRIP_LABEL,
  REVOKE_OFFER_LABEL,
  rowMenuEntries,
  TRANSFER_OWNERSHIP_LABEL,
  type RowMenuInput,
} from '../src/members/rowMenu';

function view(over: Partial<RowMenuInput> = {}): RowMenuInput {
  return {
    viewerIsOwner: true,
    isYou: false,
    rowIsOwner: false,
    offerPendingOnRow: false,
    posture: 'open',
    ...over,
  };
}

const labels = (input: RowMenuInput) => rowMenuEntries(input).map((entry) => entry.label);

describe('the row menu the owner sees on a member', () => {
  it('offers transfer above remove', () => {
    expect(labels(view())).toEqual([TRANSFER_OWNERSHIP_LABEL, REMOVE_FROM_TRIP_LABEL]);
  });

  it('swaps transfer for revoke once an offer stands on that row', () => {
    expect(labels(view({ offerPendingOnRow: true }))).toEqual([
      REVOKE_OFFER_LABEL,
      REMOVE_FROM_TRIP_LABEL,
    ]);
  });

  it('marks only removal destructive — revoking an offer takes nobody out of the trip', () => {
    const entries = rowMenuEntries(view({ offerPendingOnRow: true }));

    expect(entries.map((entry) => entry.destructive)).toEqual([false, true]);
  });
});

describe('the row menu on your own row', () => {
  it('offers leave and nothing else', () => {
    expect(labels(view({ isYou: true, viewerIsOwner: false }))).toEqual([LEAVE_TRIP_LABEL]);
  });

  it('offers leave to the owner of nothing — an owner cannot leave their own trip', () => {
    expect(labels(view({ isYou: true, rowIsOwner: true }))).toEqual([]);
  });

  it('still offers leave on a published trip', () => {
    expect(labels(view({ isYou: true, viewerIsOwner: false, posture: 'published' }))).toEqual([
      LEAVE_TRIP_LABEL,
    ]);
  });

  it('still offers leave on an archived trip — S1.9 canon over the canvas caption', () => {
    expect(labels(view({ isYou: true, viewerIsOwner: false, posture: 'archived' }))).toEqual([
      LEAVE_TRIP_LABEL,
    ]);
  });
});

describe('the row menu a member sees on somebody else', () => {
  it('is empty — removal and transfer are owner-only', () => {
    expect(labels(view({ viewerIsOwner: false }))).toEqual([]);
  });
});

describe('the row menu on a published or archived trip', () => {
  it('offers the owner nothing on somebody else’s row', () => {
    expect(labels(view({ posture: 'published' }))).toEqual([]);
    expect(labels(view({ posture: 'archived' }))).toEqual([]);
  });

  it('still offers nothing once an offer is pending — the freeze covers transfer too', () => {
    expect(labels(view({ posture: 'published', offerPendingOnRow: true }))).toEqual([]);
  });
});

describe('the owner’s row', () => {
  it('is never actionable by anyone else — transfer first', () => {
    expect(labels(view({ rowIsOwner: true }))).toEqual([]);
    expect(labels(view({ rowIsOwner: true, viewerIsOwner: false }))).toEqual([]);
  });
});
