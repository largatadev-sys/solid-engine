import {
  draftsFor,
  hasAnythingFilled,
  isUnsaved,
  isWorthSaving,
  replacedAt,
  unsavedAmong,
  withPhotos,
  withoutPhotoAt,
  type DayDraft,
  updatedAt,
} from '../src/diary/diaryDayDraft';


const photo = (name: string) => ({ uri: `file://${name}`, name, mimeType: 'image/jpeg' });


describe('the diary days draft', () => {

  it('makes one empty draft per candidate date the server sent', () => {
    const drafts = draftsFor(['2026-03-15', '2026-03-16']);

    expect(drafts).toHaveLength(2);
    expect(drafts[0]?.date).toBe('2026-03-15');
    expect(drafts[0]?.photos).toEqual([]);
    expect(drafts[0]?.savedDayId).toBeNull();
  });


  it('is worth saving only once it holds a photo', () => {
    const [empty] = draftsFor(['2026-03-15']);
    const placeOnly = { ...(empty as DayDraft), place: 'Alfama' };

    expect(isWorthSaving(empty as DayDraft)).toBe(false);
    expect(isWorthSaving(placeOnly)).toBe(false);
    expect(isWorthSaving(withPhotos(empty as DayDraft, [photo('a.jpg')], 5))).toBe(true);
  });


  it('counts a filled day as unsaved until it has a server id', () => {
    const filled = withPhotos(draftsFor(['2026-03-15'])[0] as DayDraft, [photo('a.jpg')], 5);

    expect(isUnsaved(filled)).toBe(true);
    expect(isUnsaved({ ...filled, savedDayId: 'day-1' })).toBe(false);
  });


  it('submits only the unsaved filled days, never an empty one', () => {
    const drafts = draftsFor(['2026-03-15', '2026-03-16', '2026-03-17']);
    const filled = withPhotos(drafts[0] as DayDraft, [photo('a.jpg')], 5);
    const alreadySaved = {
      ...withPhotos(drafts[1] as DayDraft, [photo('b.jpg')], 5),
      savedDayId: 'day-2',
    };

    expect(unsavedAmong([filled, alreadySaved, drafts[2] as DayDraft])).toEqual([filled]);
  });


  it('stops taking photos at the limit', () => {
    const empty = draftsFor(['2026-03-15'])[0] as DayDraft;
    const five = withPhotos(empty, [1, 2, 3, 4, 5].map((n) => photo(`${n}.jpg`)), 5);

    expect(five.photos).toHaveLength(5);
    expect(withPhotos(five, [photo('six.jpg')], 5).photos).toHaveLength(5);
  });


  it('drops a photo by position and leaves the others in order', () => {
    const three = withPhotos(
      draftsFor(['2026-03-15'])[0] as DayDraft,
      [photo('a.jpg'), photo('b.jpg'), photo('c.jpg')],
      5,
    );

    expect(withoutPhotoAt(three, 1).photos.map((p) => p.name)).toEqual(['a.jpg', 'c.jpg']);
  });


  it('replaces one draft and leaves its neighbours alone', () => {
    const drafts = draftsFor(['2026-03-15', '2026-03-16']);
    const edited = { ...(drafts[1] as DayDraft), place: 'Sintra' };

    const next = replacedAt(drafts, 1, edited);
    expect(next[0]).toBe(drafts[0]);
    expect(next[1]?.place).toBe('Sintra');
  });


  it('knows whether anything at all was filled, which is what the discard confirm asks', () => {
    const drafts = draftsFor(['2026-03-15', '2026-03-16']);

    expect(hasAnythingFilled(drafts)).toBe(false);
    expect(hasAnythingFilled(replacedAt(drafts, 0, { ...(drafts[0] as DayDraft), place: 'x' })))
      .toBe(true);
    expect(hasAnythingFilled(replacedAt(drafts, 0, { ...(drafts[0] as DayDraft), caption: 'x' })))
      .toBe(true);
  });
});


describe('updatedAt reads the draft it changes from the list it is given, never from a snapshot', () => {
  it('applies the change to the current draft at that index and leaves the others alone', () => {
    const drafts = draftsFor(['2026-03-15', '2026-03-16']);
    const typed = updatedAt(drafts, 0, (draft) => ({ ...draft, place: 'Coron' }));
    const saved = updatedAt(typed, 0, (draft) => ({ ...draft, savedDayId: 'day-1' }));

    expect(saved[0]).toEqual({ ...drafts[0], place: 'Coron', savedDayId: 'day-1' });
    expect(saved[1]).toBe(drafts[1]);
  });
});
