import { archiveControl, canEditPlan } from '../src/itineraries/archiveControls';



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
    expect(archiveControl(live, false)).toBeNull();
    expect(archiveControl(archived, false)).toBeNull();
  });
});

describe('what an archived trip hides', () => {
  it('keeps the plan editable on a live trip', () => {
    expect(canEditPlan(live)).toBe(true);
  });

  it('hides plan editing on an archived trip', () => {
    expect(canEditPlan(archived)).toBe(false);
  });

  it('hides it from the owner too — archive freezes the trip, not one person’s access', () => {
    expect(canEditPlan(archived)).toBe(false);
  });
});

