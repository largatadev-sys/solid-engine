import type { PublishedItineraryResponse } from '../types/api';

export interface GalleryPhoto {
  readonly id: string;
  readonly url: string;
  readonly thumbUrl: string;
}

export const GALLERY_VISIBLE_TILES = 5;

export function galleryOf(projection: PublishedItineraryResponse): GalleryPhoto[] {
  const cover =
    projection.coverImageUrl === null
      ? []
      : [
          {
            id: 'cover',
            url: projection.coverImageUrl,
            thumbUrl: `${projection.coverImageUrl}/thumb`,
          },
        ];

  const activityPhotos = projection.days.flatMap((day) =>
    day.activities.flatMap((activity) => activity.photos),
  );

  return [...cover, ...activityPhotos];
}


export function galleryOverflow(total: number): number {
  return Math.max(0, total - GALLERY_VISIBLE_TILES);
}
