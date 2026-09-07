import {
  addDaySubtitle,
  addToDayCta,
  dateSpanLabel,
  dayDateLabel,
  dayEyebrow,
  dayHeading,
  dayMetaLine,
  deleteDayBody,
  deleteDayTitle,
  deleteDiaryTitle,
  deletePostcardBody,
  detailMetaLine,
  discardDiaryBody,
  photoCountLabel,
  photoIndexPill,
  postcardCountLabel,
  postedOnLabel,
  rangeSummary,
  sectionMetaLine,
  shortDate,
} from '../src/diary/memoryCopy';


describe('the memory surface copy, string for string from the handoff', () => {

  it('reads the section meta line as frame 5 draws it', () => {
    expect(sectionMetaLine('Portugal', 6)).toBe('Portugal • 6 days');
    expect(sectionMetaLine('Kyoto, Japan', 5)).toBe('Kyoto, Japan • 5 days');
  });


  it('drops the bullet when there is no destination', () => {
    expect(sectionMetaLine(null, 4)).toBe('4 days');
    expect(sectionMetaLine('   ', 4)).toBe('4 days');
  });


  it('says one day, not 1 days', () => {
    expect(sectionMetaLine('Lisbon', 1)).toBe('Lisbon • 1 day');
    expect(rangeSummary(1)).toBe('1 day');
    expect(rangeSummary(6)).toBe('6 days');
  });


  it('heads a day card as frame 3 does — no year', () => {
    expect(dayHeading(1, '2026-03-15')).toBe('Day 1: Mar 15');
    expect(dayDateLabel('2026-03-16')).toBe('Mar 16');
  });


  it('writes the detail meta line as frame B does', () => {
    expect(detailMetaLine('Portugal', 6, '2026-03-15', '2026-03-20'))
      .toBe('Portugal • 6 days · Mar 15–20, 2026');
  });


  it('writes the day meta line with and without a place', () => {
    expect(dayMetaLine('2026-03-15', 'Alfama, Lisbon')).toBe('Mar 15 · Alfama, Lisbon');
    expect(dayMetaLine('2026-03-16', null)).toBe('Mar 16');
  });


  it('writes the M eyebrow in caps with the middle dot', () => {
    expect(dayEyebrow(1, '2026-03-15')).toBe('DAY 1 · MAR 15');
  });


  it('writes the add-a-day subtitle as frame E does', () => {
    expect(addDaySubtitle('Lisbon & the Algarve', 6, '2026-03-20'))
      .toBe('Lisbon & the Algarve · after Day 6, Mar 20');
  });


  it('writes a date span within one month as the mock does', () => {
    expect(dateSpanLabel('2026-03-15', '2026-03-20')).toBe('Mar 15–20, 2026');
  });


  it('spells both months when the span crosses one', () => {
    expect(dateSpanLabel('2026-03-30', '2026-04-02')).toBe('Mar 30 – Apr 2, 2026');
  });


  it('spells both years when the span crosses one', () => {
    expect(dateSpanLabel('2025-12-28', '2026-01-03')).toBe('Dec 28, 2025 – Jan 3, 2026');
  });


  it('formats a single date, and the posted-on line from an instant', () => {
    expect(shortDate('2026-03-15')).toBe('Mar 15, 2026');
    expect(postedOnLabel('2026-09-06T04:12:00Z')).toBe('Posted Sep 6, 2026');
  });


  it('counts photos against the limit, and indexes them in the pill', () => {
    expect(photoCountLabel(0, 5)).toBe('0 of 5');
    expect(photoCountLabel(3, 5)).toBe('3 of 5');
    expect(photoIndexPill(1, 3)).toBe('1/3');
  });


  it('counts postcards for the H2 rows', () => {
    expect(postcardCountLabel(1)).toBe('1 postcard');
    expect(postcardCountLabel(2)).toBe('2 postcards');
    expect(addToDayCta(3)).toBe('Add to Day 3');
  });


  it('puts the server count in the L1 and L3 confirms, singular and plural', () => {
    expect(deleteDiaryTitle(12)).toBe('Delete this diary and its 12 postcards?');
    expect(deleteDiaryTitle(1)).toBe('Delete this diary and its 1 postcard?');
    expect(deleteDayTitle(3, 2)).toBe('Delete Day 3 and its 2 postcards?');
    expect(deleteDayBody('2026-03-17', 'Sintra')).toBe('Mar 17 · Sintra. The other days keep their numbers.');
  });


  it('carries the L2 and L4 bodies word for word', () => {
    expect(deletePostcardBody()).toBe('Its photos and caption will be gone. The diary stays.');
    expect(discardDiaryBody('Lisbon & the Algarve')).toBe(
      'Lisbon & the Algarve was created when you tapped Next. Discarding deletes it and any days you filled in.',
    );
  });
});
