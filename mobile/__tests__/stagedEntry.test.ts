import {
  dropDevicePhoto,
  dropDumpPick,
  dropSavedPhoto,
  hasUnsavedChanges,
  stagedFrom,
  saveSteps,
  stagedPhotoCount,
  tilesOf,
  withoutTile,
} from '../src/diary/stagedEntry';
import type { DiaryEntryResponse } from '../src/types/api';
import type { PickedPhoto } from '../src/media/pickedPhoto';


function photo(id: string) {
  return { id, url: `/v1/media/${id}`, thumbUrl: `/v1/media/${id}/thumb` };
}

function entry(overrides: Partial<DiaryEntryResponse> = {}): DiaryEntryResponse {
  return {
    id: 'e1',
    itineraryId: 'i1',
    activityId: 'a1',
    activityTitle: 'Sunset at Las Cabanas',
    dayLabel: 'Day 1',
    timeOfDay: null,
    caption: 'as posted',
    photos: [photo('p1'), photo('p2')],
    sharedAt: null,
    createdAt: '2026-08-11T10:00:00Z',
    updatedAt: '2026-08-11T10:00:00Z',
    ...overrides,
  };
}

function picked(uri: string): PickedPhoto {
  return { uri, name: 'x.jpg', mimeType: 'image/jpeg' };
}


describe('stagedFrom', () => {
  it('starts as the entry exactly, with nothing pending', () => {
    const staged = stagedFrom(entry());

    expect(staged.caption).toBe('as posted');
    expect(staged.keptPhotoIds).toEqual(['p1', 'p2']);
    expect(staged.removedPhotoIds).toEqual([]);
    expect(hasUnsavedChanges(staged, entry())).toBe(false);
  });

  it('reads a null caption as empty rather than the string "null"', () => {
    expect(stagedFrom(entry({ caption: null })).caption).toBe('');
  });
});


describe('hasUnsavedChanges', () => {
  it('notices a caption edit, ignoring surrounding whitespace', () => {
    const staged = stagedFrom(entry());

    expect(hasUnsavedChanges({ ...staged, caption: '  as posted  ' }, entry())).toBe(false);
    expect(hasUnsavedChanges({ ...staged, caption: 'rewritten' }, entry())).toBe(true);
  });

  it('notices a staged removal, a dump pick and a device pick', () => {
    const staged = stagedFrom(entry());

    expect(hasUnsavedChanges(dropSavedPhoto(staged, 'p1'), entry())).toBe(true);
    expect(hasUnsavedChanges({ ...staged, fromDump: ['d1'] }, entry())).toBe(true);
    expect(hasUnsavedChanges({ ...staged, devicePhotos: [picked('file://a')] }, entry())).toBe(true);
  });
});


describe('dropping photos', () => {
  it('moves a saved photo to the removed list rather than forgetting it', () => {
    const staged = dropSavedPhoto(stagedFrom(entry()), 'p1');

    expect(staged.keptPhotoIds).toEqual(['p2']);
    expect(staged.removedPhotoIds).toEqual(['p1']);
  });

  it('ignores a photo that was already dropped, so the removal never doubles', () => {
    const once = dropSavedPhoto(stagedFrom(entry()), 'p1');

    expect(dropSavedPhoto(once, 'p1')).toEqual(once);
  });

  it('takes a staged dump pick back out without ever touching the server list', () => {
    const staged = dropDumpPick({ ...stagedFrom(entry()), fromDump: ['d1', 'd2'] }, 'd1');

    expect(staged.fromDump).toEqual(['d2']);
    expect(staged.removedPhotoIds).toEqual([]);
  });

  it('removes a device photo by position, since two picks can share a uri', () => {
    const staged = dropDevicePhoto(
      { ...stagedFrom(entry()), devicePhotos: [picked('file://a'), picked('file://a')] },
      0,
    );

    expect(staged.devicePhotos).toHaveLength(1);
  });
});


describe('stagedPhotoCount', () => {
  it('counts what the entry WOULD hold once saved, not what it holds now', () => {
    const staged = {
      ...dropSavedPhoto(stagedFrom(entry()), 'p1'),
      fromDump: ['d1'],
      devicePhotos: [picked('file://a')],
    };

    expect(stagedPhotoCount(staged)).toBe(3);
  });

  it('can reach zero — the floor is the server\'s to refuse at save', () => {
    const emptied = dropSavedPhoto(dropSavedPhoto(stagedFrom(entry()), 'p1'), 'p2');

    expect(stagedPhotoCount(emptied)).toBe(0);
  });
});


describe('tilesOf', () => {
  it('draws kept photos first, then dump picks, then device picks', () => {
    const staged = {
      ...stagedFrom(entry()),
      fromDump: ['d1'],
      devicePhotos: [picked('file://a')],
    };

    const tiles = tilesOf(staged, entry().photos, (id) => `/v1/media/${id}`);

    expect(tiles.map((tile) => tile.source)).toEqual(['saved', 'saved', 'dump', 'phone']);
    expect(tiles.at(2)?.url).toBe('/v1/media/d1');
    expect(tiles.at(3)?.localPreview).toBe('file://a');
  });

  it('drops a removed photo from the grid immediately', () => {
    const staged = dropSavedPhoto(stagedFrom(entry()), 'p1');

    expect(tilesOf(staged, entry().photos, () => null).map((tile) => tile.key)).toEqual(['p2']);
  });
});


describe('saveSteps — the order the server can actually accept', () => {
  const MAX = 5;

  function ran(steps: ReturnType<typeof saveSteps>, from: number): number[] {
    let held = from;
    return steps.map((step) => {
      held += step.kind === 'remove' ? -1 : 1;
      return held;
    });
  }

  it('swaps at the CAP by removing first — adding first would ask for a 6th', () => {
    const staged = {
      ...stagedFrom(entry()),
      removedPhotoIds: ['p1'],
      devicePhotos: [picked('file://a')],
    };

    const held = ran(saveSteps(staged, 5, MAX), 5);

    expect(Math.max(...held)).toBeLessThanOrEqual(MAX);
    expect(held.at(-1)).toBe(5);
  });

  it('swaps at the FLOOR by adding first — removing first would empty the entry', () => {
    const staged = {
      ...stagedFrom(entry()),
      removedPhotoIds: ['p1'],
      devicePhotos: [picked('file://a')],
    };

    const held = ran(saveSteps(staged, 1, MAX), 1);

    expect(Math.min(...held)).toBeGreaterThanOrEqual(1);
    expect(held.at(-1)).toBe(1);
  });

  it('never leaves the 1..5 window on a full swap of every photo', () => {
    const staged = {
      ...stagedFrom(entry()),
      removedPhotoIds: ['p1', 'p2', 'p3', 'p4', 'p5'],
      devicePhotos: [picked('a'), picked('b'), picked('c'), picked('d'), picked('e')],
    };

    const held = ran(saveSteps(staged, 5, MAX), 5);

    expect(Math.min(...held)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...held)).toBeLessThanOrEqual(MAX);
    expect(held.at(-1)).toBe(5);
  });

  it('carries every staged change exactly once, whatever the order', () => {
    const staged = {
      ...stagedFrom(entry()),
      removedPhotoIds: ['p1', 'p2'],
      fromDump: ['d1'],
      devicePhotos: [picked('file://a')],
    };

    const steps = saveSteps(staged, 4, MAX);

    expect(steps.filter((s) => s.kind === 'remove')).toHaveLength(2);
    expect(steps.filter((s) => s.kind === 'device')).toHaveLength(1);
    expect(steps.filter((s) => s.kind === 'dump')).toHaveLength(1);
  });

  it('does nothing when nothing is staged', () => {
    expect(saveSteps(stagedFrom(entry()), 2, MAX)).toEqual([]);
  });
});


describe('withoutTile', () => {
  const staged = {
    ...stagedFrom(entry()),
    fromDump: ['d1'],
    devicePhotos: [picked('file://a'), picked('file://b')],
  };
  const tiles = tilesOf(staged, entry().photos, () => null);

  it('sends a saved tile to the removed list, so the server is told to delete it', () => {
    const next = withoutTile(staged, tiles[0]!);

    expect(next.keptPhotoIds).toEqual(['p2']);
    expect(next.removedPhotoIds).toEqual(['p1']);
  });

  it('takes a dump pick back out with nothing to tell the server', () => {
    const next = withoutTile(staged, tiles[2]!);

    expect(next.fromDump).toEqual([]);
    expect(next.removedPhotoIds).toEqual([]);
  });

  it('removes the device photo the tile points at, not the first one', () => {
    const next = withoutTile(staged, tiles[4]!);

    expect(next.devicePhotos.map((photo) => photo.uri)).toEqual(['file://a']);
  });
});
