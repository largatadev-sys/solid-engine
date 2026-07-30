import {
  COMPLETION_BLURB,
  COMPLETION_CTA,
  COMPLETION_HEADLINE,
  completionSummary,
} from '../src/onboarding/completionSummary';
import { initialsFor } from '../src/onboarding/initials';
import type { MeResponse } from '../src/types/api';

const ME: MeResponse = {
  id: 'traveler-1',
  displayName: 'Ana Silva',
  email: 'largata.dev+t1@gmail.com',
  handle: 'anasilva',
  suggestedHandle: 'anasilva',
  avatarUrl: null,
  bio: null,
  goals: ['discover', 'earn'],
  interests: ['food', 'hiking', 'art'],
  country: 'PH',
  preferredCurrency: 'PHP',
  homeCity: 'Puerto Princesa',
  onboardingCompleted: false,
};

describe('the completion summary is a receipt, not a promise', () => {
  it('restates only what the traveler entered', () => {
    const lines = completionSummary(ME);

    expect(lines).toEqual([
      { label: 'Handle', value: '@anasilva' },
      { label: 'Here to', value: 'Discover trips, Earn from my itineraries' },
      { label: 'Interested in', value: 'Food, Hiking, Art' },
      { label: 'Based in', value: 'Puerto Princesa, Philippines' },
      { label: 'Preferred currency', value: 'PHP' },
    ]);
  });

  it('claims no behaviour that does not exist (spec decision 6, AC 10)', () => {
    const CLAIMS_NOTHING_HAS_BUILT = [
      /discovery mode/i,
      /\bpersonali[sz]/i,
      /\brecommend/i,
      /\btailor/i,
      /\bwe will\b/i,
      /\byour feed\b/i,
      /\bmatched?\b/i,
      /\bcurated\b/i,

      /\bchange any of it\b/i,
      /\bchange this later\b/i,
    ];

    const everyWordShown = [
      COMPLETION_HEADLINE,
      COMPLETION_BLURB,
      COMPLETION_CTA,
      ...completionSummary(ME).flatMap((line) => [line.label, line.value]),
    ].join(' ');

    for (const claim of CLAIMS_NOTHING_HAS_BUILT) {
      expect(everyWordShown).not.toMatch(claim);
    }
  });

  it('the ban list would actually fire on the wording that was cut', () => {
    expect('Discovery mode active').toMatch(/discovery mode/i);
    expect('You can change any of it from your profile.').toMatch(/\bchange any of it\b/i);
  });

  it('promises no edit surface that does not exist: only handle, name and bio are editable', () => {
    const EDITABLE_ON_THE_ME_SCREEN = ['Handle'];
    const summarised = completionSummary(ME).map((line) => line.label);

    expect(summarised).not.toEqual(EDITABLE_ON_THE_ME_SCREEN);
    expect(COMPLETION_BLURB).not.toMatch(/\byour profile\b/i);
  });

  it('omits a line rather than printing an empty one', () => {
    const bare = completionSummary({
      ...ME,
      handle: null,
      goals: [],
      interests: [],
      country: null,
      preferredCurrency: null,
      homeCity: null,
    });

    expect(bare).toEqual([]);
  });

  it('a city with no country, or a country with no city, still reads properly', () => {
    expect(completionSummary({ ...ME, country: null })).toContainEqual({
      label: 'Based in',
      value: 'Puerto Princesa',
    });
    expect(completionSummary({ ...ME, homeCity: null })).toContainEqual({
      label: 'Based in',
      value: 'Philippines',
    });
    expect(completionSummary({ ...ME, homeCity: '   ' })).toContainEqual({
      label: 'Based in',
      value: 'Philippines',
    });
  });

  it('an option the client does not know about is dropped rather than shown raw', () => {
    const lines = completionSummary({ ...ME, interests: ['food', 'something_from_the_future'] });

    expect(lines).toContainEqual({ label: 'Interested in', value: 'Food' });
  });
});

describe('the initials avatar an email sign-up gets', () => {
  it('uses the display name when there is one', () => {
    expect(initialsFor('Ana Silva', 'a@b.c')).toBe('AS');
    expect(initialsFor('Ana', 'a@b.c')).toBe('A');
  });

  it('falls back to the email local part, splitting on its punctuation', () => {
    expect(initialsFor(null, 'ana.silva@example.com')).toBe('AS');
    expect(initialsFor('', 'largata.dev+t1@gmail.com')).toBe('LD');
  });

  it('splits a pool fixture name the same way, so it is not one lonely letter', () => {
    expect(initialsFor('largata.dev+t1', 'largata.dev+t1@gmail.com')).toBe('LD');
  });

  it('never renders empty, whatever it is given', () => {
    expect(initialsFor(null, null)).toBe('?');
    expect(initialsFor('   ', '   ')).toBe('?');
    expect(initialsFor('!!!', '!!!@x.y')).toBe('?');
  });
});
