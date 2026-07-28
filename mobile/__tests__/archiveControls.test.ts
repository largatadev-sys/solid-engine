import { archiveControl, canEditPlan, canLeaveTrip } from '../src/itineraries/archiveControls';

/**
 * The archive surface's decisions (S1.9, ticket 04).
 *
 * <p>Three questions, and the third is the one worth the file: <em>who gets a lever</em> (the owner
 * only), <em>what disappears while frozen</em> (the plan's editing affordances), and <em>what must
 * not</em> (leaving). That last is the founder's rule at the grilling — acts on the trip freeze, acts
 * on your own membership do not — and it is the kind of rule a later "hide the controls on archived
 * trips" sweep would quietly break. The test is the executable version of the note on the function.
 *
 * <p>The screen renders these answers and holds no logic of its own, for the reason `memberControls`
 * and `lifecycleBanner` record: this repo cannot render a screen in Jest (S0.3).
 */

const live = { archived: false };
const archived = { archived: true };

describe('who gets an archive lever', () => {
  it('offers the owner Archive on a live trip', () => {
    expect(archiveControl(live, true)).toEqual({ act: 'archive' });
  });

  it('offers the owner Unarchive on an archived trip', () => {
    expect(archiveControl(archived, true)).toEqual({ act: 'unarchive' });
  });

  it('offers a member nothing, on either — archive is the owner’s', () => {
    // S1.3's split: members shape the plan, the owner keeps lifecycle, membership and existence. The
    // server answers 403 regardless; this is why a member is not shown a button that would be refused.
    expect(archiveControl(live, false)).toBeNull();
    expect(archiveControl(archived, false)).toBeNull();
  });
});

describe('what an archived trip hides', () => {
  it('keeps the plan editable on a live trip', () => {
    expect(canEditPlan(live)).toBe(true);
  });

  it('hides plan editing on an archived trip', () => {
    // Not "disables": every plan write answers TRIP_ARCHIVED, so a tappable control would be a
    // guaranteed failure — the dead end this repo declines to advertise (S1.5's members screen).
    expect(canEditPlan(archived)).toBe(false);
  });

  it('hides it from the owner too — archive freezes the trip, not one person’s access', () => {
    // The owner has no more write access than anyone else while archived; their lever is unarchive.
    expect(canEditPlan(archived)).toBe(false);
  });
});

describe('what an archived trip must NOT hide', () => {
  it('leaves Leave available on an archived trip', () => {
    // The founder's rule: acts on the trip freeze, acts on your own membership do not. Hiding Leave
    // alongside the plan controls would strand a member on somebody else's decision, with no lever of
    // their own and no way to unarchive. The server exempts self-removal from the fence for the same
    // reason, so a hidden control here would contradict a working endpoint.
    expect(canLeaveTrip(archived)).toBe(true);
  });

  it('and on a live one, unchanged', () => {
    expect(canLeaveTrip(live)).toBe(true);
  });
});
