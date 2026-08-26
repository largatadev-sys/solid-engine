import {
  cappedPeople,
  combinedCountLine,
  showsPeopleGroup,
  PEOPLE_GROUP_CAP,
} from '../src/discovery/combinedResults';


describe('the executed search: people and trips on one screen', () => {
  it('counts both halves in one line', () => {
    expect(combinedCountLine(6, 12)).toBe('6 people · 12 trips');
  });

  it('says "1 person" and "1 trip" rather than pluralising everything', () => {
    expect(combinedCountLine(1, 1)).toBe('1 person · 1 trip');
  });

  it('reports an empty half honestly instead of hiding it', () => {
    expect(combinedCountLine(1, 0)).toBe('1 person · 0 trips');
    expect(combinedCountLine(0, 4)).toBe('0 people · 4 trips');
  });

  it('shows the People group from the very first match, not the fourth', () => {
    expect(showsPeopleGroup(1)).toBe(true);
    expect(showsPeopleGroup(3)).toBe(true);
    expect(showsPeopleGroup(4)).toBe(true);
  });

  it('shows no People group when nobody matches', () => {
    expect(showsPeopleGroup(0)).toBe(false);
  });

  it('caps the group at three rows however many matched', () => {
    expect(cappedPeople([1, 2, 3, 4, 5])).toEqual([1, 2, 3]);
    expect(cappedPeople([1])).toEqual([1]);
    expect(PEOPLE_GROUP_CAP).toBe(3);
  });
});
