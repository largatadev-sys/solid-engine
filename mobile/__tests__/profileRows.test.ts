import { latestActivityOf, profileRows } from '../src/diary/profileRows';
import type {
  DiaryPostcardResponse,
  DiarySectionResponse,
  DiarySectionsResponse,
} from '../src/types/api';

function postcard(id: string, createdAt: string): DiaryPostcardResponse {
  return {
    id,
    diaryId: null,
    diaryDayId: null,
    tripId: null,
    activityId: null,
    activityTitle: null,
    dayLabel: null,
    caption: null,
    place: null,
    photos: [],
    createdAt,
    updatedAt: createdAt,
  };
}

function diary(
  id: string,
  updatedAt: string,
  postcards: readonly DiaryPostcardResponse[],
): DiarySectionResponse {
  return {
    id,
    authorId: 'author',
    author: null,
    tripId: null,
    title: id,
    destination: null,
    startDate: '2026-03-15',
    endDate: '2026-03-20',
    cover: null,
    dayCount: postcards.length > 0 ? 1 : 0,
    postcardCount: postcards.length,
    days:
      postcards.length > 0
        ? [{ id: `${id}-day`, ordinal: 1, date: '2026-03-15', place: null, postcardCount: postcards.length, postcards: [...postcards] }]
        : [],
    candidateDates: [],
    createdAt: updatedAt,
    updatedAt,
    itineraryId: null,
  } as unknown as DiarySectionResponse;
}

function sections(
  diaries: readonly DiarySectionResponse[],
  loosePostcards: readonly DiaryPostcardResponse[],
): DiarySectionsResponse {
  return { diaries: [...diaries], loosePostcards: [...loosePostcards], diaryCount: diaries.length };
}


describe('the profile lists whatever was posted last first, diary or postcard alike', () => {
  it('a diary is as recent as its newest postcard, not its own row', () => {
    const told = diary('lisbon', '2026-09-01T10:00:00Z', [postcard('p1', '2026-09-05T09:00:00Z')]);

    expect(latestActivityOf(told)).toBe('2026-09-05T09:00:00Z');
  });

  it('a diary with no postcards is as recent as its last edit', () => {
    expect(latestActivityOf(diary('empty', '2026-09-02T10:00:00Z', []))).toBe('2026-09-02T10:00:00Z');
  });

  it('interleaves loose postcards and diary sections by that recency, newest first', () => {
    const rows = profileRows(
      sections(
        [
          diary('old', '2026-08-01T10:00:00Z', []),
          diary('lisbon', '2026-09-01T10:00:00Z', [postcard('p1', '2026-09-05T09:00:00Z')]),
        ],
        [postcard('loose-mid', '2026-09-03T12:00:00Z'), postcard('loose-new', '2026-09-06T08:00:00Z')],
      ),
    );

    expect(rows.map((row) => (row.kind === 'diary' ? row.section.id : row.postcard.id))).toEqual([
      'loose-new',
      'lisbon',
      'loose-mid',
      'old',
    ]);
  });

  it('survives the server’s nanosecond instants, which differ in length', () => {
    const rows = profileRows(
      sections(
        [diary('short', '2026-09-06T08:40:02.06Z', [])],
        [postcard('long', '2026-09-06T08:40:02.069932912Z')],
      ),
    );

    expect(rows.map((row) => row.kind)).toEqual(['postcard', 'diary']);
  });
});
