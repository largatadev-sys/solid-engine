import {
  dateSpanLabel,
  dayDateLabel,
  dayHeading,
  deleteDiaryTitle,
  photoCountLabel,
  rangeSummary,
  sectionMetaLine,
  shortDate,
} from '../src/diary/memoryCopy';


describe('the memory surface copy', () => {

  it('reads the section meta line as the mock draws it', () => {
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


  it('heads a day with its ordinal and date', () => {
    expect(dayHeading(1, '2026-03-15')).toBe('Day 1: Mar 15, 2026');
    expect(dayDateLabel('2026-03-16')).toBe('Mar 16');
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


  it('formats a single date', () => {
    expect(shortDate('2026-03-15')).toBe('Mar 15, 2026');
  });


  it('counts photos against the limit', () => {
    expect(photoCountLabel(0, 5)).toBe('0 of 5');
    expect(photoCountLabel(3, 5)).toBe('3 of 5');
  });


  it('puts the server count in the delete confirm, singular and plural', () => {
    expect(deleteDiaryTitle(12)).toBe('Delete this diary and its 12 postcards?');
    expect(deleteDiaryTitle(1)).toBe('Delete this diary and its 1 postcard?');
  });
});
