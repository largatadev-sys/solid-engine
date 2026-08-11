import type { DiaryEntryResponse, DiaryPhotoResponse } from '../types/api';
import type { PickedPhoto } from '../media/pickedPhoto';


export interface StagedEntry {
  readonly caption: string;
  readonly keptPhotoIds: readonly string[];
  readonly removedPhotoIds: readonly string[];
  readonly fromDump: readonly string[];
  readonly devicePhotos: readonly PickedPhoto[];
}


export interface StagedTile {
  readonly key: string;
  readonly url: string | null;
  readonly localPreview: string | null;
  readonly source: 'phone' | 'dump' | 'saved';
  readonly photoId: string;
  readonly at: number;
}


export type SaveStep =
  | { readonly kind: 'remove'; readonly photoId: string }
  | { readonly kind: 'device'; readonly at: number }
  | { readonly kind: 'dump'; readonly photoId: string };


export function saveSteps(
  staged: StagedEntry,
  savedCount: number,
  maxPhotos: number,
): SaveStep[] {
  const removals: SaveStep[] = staged.removedPhotoIds.map((photoId) => ({
    kind: 'remove',
    photoId,
  }));
  const additions: SaveStep[] = [
    ...staged.devicePhotos.map((_, at): SaveStep => ({ kind: 'device', at })),
    ...staged.fromDump.map((photoId): SaveStep => ({ kind: 'dump', photoId })),
  ];

  const steps: SaveStep[] = [];
  let held = savedCount;

  while (removals.length > 0 || additions.length > 0) {
    const canAdd = additions.length > 0 && held < maxPhotos;
    const canRemove = removals.length > 0 && held > 1;

    if (canAdd) {
      steps.push(additions.shift()!);
      held += 1;
    } else if (canRemove) {
      steps.push(removals.shift()!);
      held -= 1;
    } else if (removals.length > 0) {
      steps.push(removals.shift()!);
      held -= 1;
    } else {
      steps.push(additions.shift()!);
      held += 1;
    }
  }

  return steps;
}


export function withoutTile(staged: StagedEntry, tile: StagedTile): StagedEntry {
  if (tile.source === 'saved') return dropSavedPhoto(staged, tile.photoId);
  if (tile.source === 'dump') return dropDumpPick(staged, tile.photoId);
  return dropDevicePhoto(staged, tile.at);
}


export function stagedFrom(entry: DiaryEntryResponse): StagedEntry {
  return {
    caption: entry.caption ?? '',
    keptPhotoIds: entry.photos.map((photo) => photo.id),
    removedPhotoIds: [],
    fromDump: [],
    devicePhotos: [],
  };
}


export function stagedPhotoCount(staged: StagedEntry): number {
  return staged.keptPhotoIds.length + staged.fromDump.length + staged.devicePhotos.length;
}


export function hasUnsavedChanges(staged: StagedEntry, entry: DiaryEntryResponse): boolean {
  return (
    staged.caption.trim() !== (entry.caption ?? '') ||
    staged.removedPhotoIds.length > 0 ||
    staged.fromDump.length > 0 ||
    staged.devicePhotos.length > 0
  );
}


export function dropSavedPhoto(staged: StagedEntry, photoId: string): StagedEntry {
  if (!staged.keptPhotoIds.includes(photoId)) return staged;
  return {
    ...staged,
    keptPhotoIds: staged.keptPhotoIds.filter((id) => id !== photoId),
    removedPhotoIds: [...staged.removedPhotoIds, photoId],
  };
}


export function dropDumpPick(staged: StagedEntry, photoId: string): StagedEntry {
  return { ...staged, fromDump: staged.fromDump.filter((id) => id !== photoId) };
}


export function dropDevicePhoto(staged: StagedEntry, at: number): StagedEntry {
  return { ...staged, devicePhotos: staged.devicePhotos.filter((_, index) => index !== at) };
}


export function tilesOf(
  staged: StagedEntry,
  saved: readonly DiaryPhotoResponse[],
  dumpUrlOf: (photoId: string) => string | null,
): StagedTile[] {
  const kept = staged.keptPhotoIds
    .map((id) => saved.find((photo) => photo.id === id))
    .filter((photo): photo is DiaryPhotoResponse => photo !== undefined)
    .map((photo, at): StagedTile => ({
      key: photo.id,
      url: photo.url,
      localPreview: null,
      source: 'saved',
      photoId: photo.id,
      at,
    }));

  const fromDump = staged.fromDump.map((id, at): StagedTile => ({
    key: `dump-${id}`,
    url: dumpUrlOf(id),
    localPreview: null,
    source: 'dump',
    photoId: id,
    at,
  }));

  const fromDevice = staged.devicePhotos.map((photo, at): StagedTile => ({
    key: `device-${photo.uri}-${at}`,
    url: null,
    localPreview: photo.uri,
    source: 'phone',
    photoId: '',
    at,
  }));

  return [...kept, ...fromDump, ...fromDevice];
}
