import { creatorPill } from '../src/profile/creatorPill';

const READY = {
  isOwnProfile: false,
  handle: 'maya',
  loading: false,
  failed: false,
  relation: 'none' as const,
};


describe('the pill on the published page is hidden, never disabled (S4.40 decision 7)', () => {
  it('shows the relation the creator profile reported', () => {
    expect(creatorPill(READY)).toEqual({ shown: true, relation: 'none' });
    expect(creatorPill({ ...READY, relation: 'requested' })).toEqual({
      shown: true,
      relation: 'requested',
    });
    expect(creatorPill({ ...READY, relation: 'following' }).relation).toBe('following');
  });

  it('shows nothing at all on the viewer own published page', () => {
    expect(creatorPill({ ...READY, isOwnProfile: true }).shown).toBe(false);
  });

  it('shows nothing while the profile read is still in flight, rather than a wrong state', () => {
    expect(creatorPill({ ...READY, loading: true }).shown).toBe(false);
  });

  it('shows nothing when the read failed — a 404 creator gets no control', () => {
    expect(creatorPill({ ...READY, failed: true }).shown).toBe(false);
  });

  it('shows nothing when the creator has no handle, since there is nobody to follow', () => {
    expect(creatorPill({ ...READY, handle: null }).shown).toBe(false);
  });

  it('shows nothing when no relation arrived, even with everything else settled', () => {
    expect(creatorPill({ ...READY, relation: undefined }).shown).toBe(false);
  });

  it('hides on any one reason, so the reasons need no ordering', () => {
    const reasons = [
      { isOwnProfile: true },
      { loading: true },
      { failed: true },
      { handle: null },
    ];

    for (const reason of reasons) {
      expect(creatorPill({ ...READY, ...reason }).shown).toBe(false);
    }
  });
});
