import {
  dropDevicePhoto,
  dropDumpPick,
  dropSavedPhoto,
  hasUnsavedChanges,
  stagedFrom,
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
