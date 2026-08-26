import {
  PEOPLE_NO_RESULTS_SUPPORT,
  PROFILE_UNAVAILABLE,
  PUBLIC_DIARY_EMPTY_TITLE,
  firstNameOf,
  noPeopleMatchTitle,
  peopleCountLabel,
  publicDiaryEmptyBody,
  publicItinerariesEmptyBody,
} from '../src/profile/publicProfileCopy';

describe('the empty-profile copy the canvas fixes word for word (frame 1b)', () => {
  it('is headed the way the frame heads it', () => {
    expect(PUBLIC_DIARY_EMPTY_TITLE).toBe('Nothing published yet');
  });

  it('addresses the subject by first name, as the frame does', () => {
    expect(publicDiaryEmptyBody('Kai Cabrera')).toBe(
      "When Kai publishes postcards from their trips, they'll show up here.",
    );
  });

  it('mirrors that wording on the Itineraries tab (C7)', () => {
    expect(publicItinerariesEmptyBody('Kai Cabrera')).toBe(
      "When Kai publishes itineraries, they'll show up here.",
    );
  });

  it('never renders an empty gap where the name goes', () => {
    expect(publicDiaryEmptyBody(null)).toContain('this traveler');
    expect(publicDiaryEmptyBody('   ')).toContain('this traveler');
  });

  it('takes the first name of a single-word display name unchanged', () => {
    expect(firstNameOf('Maya')).toBe('Maya');
  });
});


describe('the people results copy (frame 1d)', () => {
  it('counts people the way the count line reads', () => {
    expect(peopleCountLabel(6)).toBe('6 people');
    expect(peopleCountLabel(0)).toBe('0 people');
  });

  it('does not say "1 people"', () => {
    expect(peopleCountLabel(1)).toBe('1 person');
  });

  it('quotes the query back in the no-results title, as the frame draws it', () => {
    expect(noPeopleMatchTitle('zz')).toBe('No one matches "zz"');
  });

  it('carries the frame\'s support line verbatim', () => {
    expect(PEOPLE_NO_RESULTS_SUPPORT).toBe(
      'Check the spelling, or try a display name instead of a handle.',
    );
  });
});


describe('the 404 state', () => {
  it('renders C7\'s wording, which covers an unknown, renamed or un-onboarded handle alike', () => {
    expect(PROFILE_UNAVAILABLE).toBe("This profile isn't available");
  });
});
