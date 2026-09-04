import { profileProjection } from '../src/profile/lockedProfile';
import type { ProfileVisibility, ViewerRelation } from '../src/types/api';

const RELATIONS: ViewerRelation[] = ['none', 'requested', 'following'];
const VISIBILITIES: ProfileVisibility[] = ['public', 'private'];


describe('what a private profile shows, and to whom (S4.40 decisions 3 and 4)', () => {
  it('locks a private profile against a stranger', () => {
    expect(profileProjection('private', 'none')).toEqual({
      locked: true,
      showsTabs: false,
      showsShowcase: false,
      showsNotice: true,
      followCellsOpen: false,
    });
  });

  it('keeps it locked while a request is only pending — asking is not being let in', () => {
    expect(profileProjection('private', 'requested').locked).toBe(true);
  });

  it('opens it to an approved follower, exactly as S4.37 shipped it', () => {
    expect(profileProjection('private', 'following')).toEqual({
      locked: false,
      showsTabs: true,
      showsShowcase: true,
      showsNotice: false,
      followCellsOpen: true,
    });
  });

  it('never locks a public profile, whatever the viewer has or has not done', () => {
    for (const relation of RELATIONS) {
      expect(profileProjection('public', relation).locked).toBe(false);
    }
  });

  it('hides the showcase on the locked page, published trips or not', () => {
    expect(profileProjection('private', 'none').showsShowcase).toBe(false);
  });

  it('draws the notice exactly where the tabs are not, and never both', () => {
    for (const visibility of VISIBILITIES) {
      for (const relation of RELATIONS) {
        const shown = profileProjection(visibility, relation);
        expect(shown.showsNotice).toBe(!shown.showsTabs);
      }
    }
  });

  it('makes the Followers and Following cells inert exactly when locked', () => {
    for (const visibility of VISIBILITIES) {
      for (const relation of RELATIONS) {
        const shown = profileProjection(visibility, relation);
        expect(shown.followCellsOpen).toBe(!shown.locked);
      }
    }
  });
});
