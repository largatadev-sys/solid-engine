import { galleryOf, galleryOverflow, GALLERY_VISIBLE_TILES } from '../src/media/galleryOf';
import type { PublishedItineraryResponse } from '../src/types/api';

function projection(
  coverImageUrl: string | null,
  activityPhotoUrls: string[][],
): PublishedItineraryResponse {
  return {
    coverImageUrl,
    days: activityPhotoUrls.map((urls, dayIndex) => ({
      id: `day-${dayIndex}`,
      ordinal: dayIndex + 1,
      title: null,
      activities: [
        {
          id: `activity-${dayIndex}`,
          photos: urls.map((url) => ({ id: url, url, thumbUrl: `${url}/thumb` })),
        },
      ],
    })),
  } as unknown as PublishedItineraryResponse;
}

describe('galleryOf — the gallery is derived, never an entity', () => {
  it('is empty when the trip has no cover and no activity photos', () => {
    expect(galleryOf(projection(null, [[]]))).toEqual([]);
  });

  it('leads with the cover', () => {
    const gallery = galleryOf(projection('/v1/media/cover', [['/v1/media/a']]));

    expect(gallery[0]?.url).toBe('/v1/media/cover');
    expect(gallery[0]?.thumbUrl).toBe('/v1/media/cover/thumb');
  });

  it('follows the plan order across days', () => {
    const gallery = galleryOf(
      projection(null, [['/v1/media/d1a', '/v1/media/d1b'], ['/v1/media/d2a']]),
    );

    expect(gallery.map((photo) => photo.url)).toEqual([
      '/v1/media/d1a',
      '/v1/media/d1b',
      '/v1/media/d2a',
    ]);
  });

  it('omits the cover slot entirely when there is no cover', () => {
    const gallery = galleryOf(projection(null, [['/v1/media/a']]));

    expect(gallery).toHaveLength(1);
    expect(gallery[0]?.id).not.toBe('cover');
  });
});

describe('galleryOverflow', () => {
  it('is zero while the gallery fits', () => {
    expect(galleryOverflow(GALLERY_VISIBLE_TILES)).toBe(0);
    expect(galleryOverflow(0)).toBe(0);
  });

  it('counts what the grid cannot show', () => {
    expect(galleryOverflow(GALLERY_VISIBLE_TILES + 27)).toBe(27);
  });
});
