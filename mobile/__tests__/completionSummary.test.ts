import {
  COMPLETION_BLURB,
  COMPLETION_CTA,
  COMPLETION_HEADLINE,
  SUMMARY_TITLE,
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
  interests: ['adventure', 'food_culture', 'solo_travel'],
  country: 'PH',
  preferredCurrency: 'PHP',
  homeCity: 'Puerto Princesa',
  onboardingCompleted: false,
  vanityNumber: '010042',
};

describe('the completion screen matches the design copy', () => {
  it('uses the export wording verbatim', () => {
    expect(COMPLETION_HEADLINE).toBe("You're all set!");
    expect(COMPLETION_BLURB).toBe('Your Largata account is ready.');
    expect(COMPLETION_CTA).toBe('Explore Largata');
    expect(SUMMARY_TITLE).toBe('Summary');
  });
});

describe('the summary is a receipt, not a promise', () => {
  it('restates only what the traveler entered', () => {
    expect(completionSummary(ME)).toEqual([
      'Signed in as @anasilva',
      '3 Interests selected',
      'Based in Puerto Princesa, Philippines',
      'PHP is your preferred currency',
    ]);
  });

  it('keeps the design row it can keep, verbatim in shape', () => {
    expect(completionSummary(ME)).toContain('3 Interests selected');
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
      /\benabled\b/i,
      /\bactive\b/i,
      /\bchange any of it\b/i,
      /\bchange this later\b/i,
    ];

    const everyWordShown = [
      COMPLETION_HEADLINE,
      COMPLETION_BLURB,
      COMPLETION_CTA,
      SUMMARY_TITLE,
      ...completionSummary(ME),
    ].join(' ');

    for (const claim of CLAIMS_NOTHING_HAS_BUILT) {
      expect(everyWordShown).not.toMatch(claim);
    }
  });

  it('the ban list would fire on the two design rows that had to be reworded', () => {
    expect('Discovery mode active').toMatch(/discovery mode/i);
    expect('PHP currency enabled').toMatch(/\benabled\b/i);
  });

  it('singularises one interest rather than printing "1 Interests"', () => {
    expect(completionSummary({ ...ME, interests: ['adventure'] })).toContain('1 Interest selected');
  });

  it('omits a row rather than printing an empty one', () => {
    expect(
      completionSummary({
        ...ME,
        handle: null,
        goals: [],
        interests: [],
        country: null,
        preferredCurrency: null,
        homeCity: null,
      }),
    ).toEqual([]);
  });

  it('a city with no country, or a country with no city, still reads properly', () => {
    expect(completionSummary({ ...ME, country: null })).toContain('Based in Puerto Princesa');
    expect(completionSummary({ ...ME, homeCity: null })).toContain('Based in Philippines');
    expect(completionSummary({ ...ME, homeCity: '   ' })).toContain('Based in Philippines');
  });

  it('an option the client does not know about is not counted', () => {
    expect(completionSummary({ ...ME, interests: ['adventure', 'from_the_future'] })).toContain(
      '1 Interest selected',
    );
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
