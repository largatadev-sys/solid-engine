import {
  COG_IS_LIVE,
  showsSettingsCog,
  workspaceMenuItems,
} from '../src/itineraries/tripSettingsItems';


const OWNER = true;
const COLLABORATOR = false;

const draft = { published: false, archived: false };
const published = { published: true, archived: false };
const archived = { published: false, archived: true };
const archivedAndPublished = { published: true, archived: true };


describe('the cog menu — role × editable × published (S4.25 artboard 1b)', () => {
  it('offers the owner of an editable trip exactly Edit details', () => {
    expect(workspaceMenuItems(draft, OWNER)).toEqual(['edit-details']);
  });

  it('offers the owner of a published trip exactly View published and Unpublish', () => {
    expect(workspaceMenuItems(published, OWNER)).toEqual(['view-published', 'unpublish']);
  });

  it('offers a collaborator on a published trip View published alone', () => {
    expect(workspaceMenuItems(published, COLLABORATOR)).toEqual(['view-published']);
  });

  it('offers a collaborator on an unpublished trip nothing at all', () => {
    expect(workspaceMenuItems(draft, COLLABORATOR)).toEqual([]);
  });

  it('withholds Edit details on an archived trip, from the owner too', () => {
    expect(workspaceMenuItems(archived, OWNER)).toEqual([]);
  });

  it('withholds Unpublish on an archived trip while View published survives', () => {
    expect(workspaceMenuItems(archivedAndPublished, OWNER)).toEqual(['view-published']);
  });

  it('never offers Edit details while the trip is published — publishing freezes editing', () => {
    expect(workspaceMenuItems(published, OWNER)).not.toContain('edit-details');
  });
});


describe('the cog itself — PARKED (founder, 2026-08-18: the pencil will do for now)', () => {
  it('renders nowhere at all while COG_IS_LIVE is false', () => {
    expect(COG_IS_LIVE).toBe(false);

    expect(showsSettingsCog(draft, OWNER)).toBe(false);
    expect(showsSettingsCog(published, OWNER)).toBe(false);
    expect(showsSettingsCog(published, COLLABORATOR)).toBe(false);
    expect(showsSettingsCog(draft, COLLABORATOR)).toBe(false);
    expect(showsSettingsCog(archived, OWNER)).toBe(false);
  });

  it('keeps the visibility rule intact behind the flag, so unparking is one line', () => {
    expect(workspaceMenuItems(draft, OWNER)).toEqual(['edit-details']);
    expect(workspaceMenuItems(draft, COLLABORATOR)).toEqual([]);
    expect(workspaceMenuItems(archived, OWNER)).toEqual([]);
  });
});
