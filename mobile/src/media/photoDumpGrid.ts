import type { PhotoDumpEntryResponse } from '../types/api';


export interface DumpTile {
  readonly photo: PhotoDumpEntryResponse;
  readonly deletable: boolean;
}


export function photoDumpTiles(
  photos: readonly PhotoDumpEntryResponse[],
  myId: string | undefined,
  isOwner: boolean,
  archived: boolean,
): DumpTile[] {
  return photos.map((photo) => ({
    photo,
    deletable: !archived && myId !== undefined && (isOwner || photo.uploadedBy === myId),
  }));
}


export function flattenPhotoDumpPages(
  pages: readonly { items: PhotoDumpEntryResponse[] }[] | undefined,
): PhotoDumpEntryResponse[] {
  return (pages ?? []).flatMap((page) => page.items);
}
