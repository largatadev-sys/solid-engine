import { flattenPhotoDumpPages, photoDumpTiles } from '../src/media/photoDumpGrid';
import { workspaceTabFrom, WORKSPACE_TABS } from '../src/itineraries/WorkspaceTabRow';
import type { PhotoDumpEntryResponse } from '../src/types/api';


function photo(id: string, uploadedBy: string): PhotoDumpEntryResponse {
  return {
    id,
    url: `/v1/media/${id}`,
    thumbUrl: `/v1/media/${id}/thumb`,
    uploadedBy,
    createdAt: '2026-08-11T10:00:00Z',
  };
}


describe('photoDumpTiles', () => {
  const mine = photo('p1', 't1');
  const theirs = photo('p2', 't2');

  it('lets a member delete their own photo and nobody elses', () => {
    const tiles = photoDumpTiles([mine, theirs], 't1', false, false);

    expect(tiles.map((tile) => tile.deletable)).toEqual([true, false]);
  });

  it('lets the owner delete anyones photo', () => {
    const tiles = photoDumpTiles([mine, theirs], 't1', true, false);

    expect(tiles.map((tile) => tile.deletable)).toEqual([true, true]);
  });

  it('offers no deletion at all on an archived trip, owner included', () => {
    const tiles = photoDumpTiles([mine, theirs], 't1', true, true);

    expect(tiles.map((tile) => tile.deletable)).toEqual([false, false]);
  });

  it('offers no deletion while the traveler is unknown', () => {
    const tiles = photoDumpTiles([mine, theirs], undefined, false, false);

    expect(tiles.map((tile) => tile.deletable)).toEqual([false, false]);
  });

  it('keeps the pool in the order the server paged it', () => {
    const tiles = photoDumpTiles([theirs, mine], 't1', false, false);

    expect(tiles.map((tile) => tile.photo.id)).toEqual(['p2', 'p1']);
  });

  it('is what the preview asks to decide whether to offer Delete, so every tile stays openable', () => {
    const tiles = photoDumpTiles([mine, theirs], 't1', false, true);

    expect(tiles).toHaveLength(2);
    expect(tiles.map((tile) => tile.photo.id)).toEqual(['p1', 'p2']);
  });
});


describe('flattenPhotoDumpPages', () => {
  it('joins every page into one pool, in page order', () => {
    const pages = [{ items: [photo('a', 't1')] }, { items: [photo('b', 't2')] }];

    expect(flattenPhotoDumpPages(pages).map((entry) => entry.id)).toEqual(['a', 'b']);
  });

  it('reads an unfetched pool as empty rather than throwing', () => {
    expect(flattenPhotoDumpPages(undefined)).toEqual([]);
  });
});


describe('workspaceTabFrom', () => {
  it('opens the Photo Dump tab when the route asks for it (S3.4)', () => {
    expect(workspaceTabFrom('photo-dump')).toBe('photo-dump');
  });

  it('falls back to Day-by-Day for anything it does not recognise', () => {
    expect(workspaceTabFrom(undefined)).toBe('day-by-day');
    expect(workspaceTabFrom('nonsense')).toBe('day-by-day');
  });

  it('refuses to open a tab that is still greyed', () => {
    const greyed = WORKSPACE_TABS.filter((tab) => tab.comingSoonSurface !== undefined);

    expect(greyed.length).toBeGreaterThan(0);
    for (const tab of greyed) {
      expect(workspaceTabFrom(tab.key)).toBe('day-by-day');
    }
  });

  it('has stopped greying the Photo Dump tab', () => {
    const dump = WORKSPACE_TABS.find((tab) => tab.key === 'photo-dump');

    expect(dump?.comingSoonSurface).toBeUndefined();
  });
});
