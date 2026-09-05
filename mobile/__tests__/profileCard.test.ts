import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stillShowing } from '../src/components/stillShowing';
import { profileCardOf, profileCardOfMember } from '../src/profile/profileCard';
import type { MemberResponse, MeResponse } from '../src/types/api';

const MOBILE_ROOT = join(__dirname, '..');

const ME: MeResponse = {
  id: 'traveler-1',
  displayName: 'Ana Silva',
  email: 'largata.dev+t1@gmail.com',
  handle: 'anasilva',
  suggestedHandle: 'anasilva',
  avatarUrl: '/v1/media/photo-1',
  bio: 'Walks slowly, photographs everything.',
  goals: ['discover'],
  interests: ['adventure'],
  country: 'PH',
  preferredCurrency: 'PHP',
  homeCity: 'Puerto Princesa',
  onboardingCompleted: true,
  vanityNumber: '010042',
  profileVisibility: 'public',
};

const MEMBER: MemberResponse = {
  travelerId: 'traveler-2',
  displayName: 'Beto Cruz',
  avatarUrl: '/v1/media/photo-2',
  role: 'member',
  joinedAt: '2026-08-09T00:00:00Z',
  ownershipOffered: false,
  handle: 'betocruz',
  bio: 'Always finds the good coffee.',
  vanityNumber: '010043',
};

describe('the card the profile surfaces share', () => {
  it('carries the five fields the founder named, from the own profile', () => {
    expect(profileCardOf(ME)).toEqual({
      avatarUrl: '/v1/media/photo-1',
      displayName: 'Ana Silva',
      handle: 'anasilva',
      bio: 'Walks slowly, photographs everything.',
      vanityNumber: '010042',
    });
  });

  it('carries the same five from a roster member, so both surfaces render one shape', () => {
    expect(profileCardOfMember(MEMBER)).toEqual({
      avatarUrl: '/v1/media/photo-2',
      displayName: 'Beto Cruz',
      handle: 'betocruz',
      bio: 'Always finds the good coffee.',
      vanityNumber: '010043',
    });
  });

  it('nulls a field rather than dropping it, so the renderer has one hiding rule', () => {
    expect(profileCardOf({ ...ME, handle: null, bio: null, vanityNumber: null, avatarUrl: null })).toEqual(
      {
        avatarUrl: null,
        displayName: 'Ana Silva',
        handle: null,
        bio: null,
        vanityNumber: null,
      },
    );
  });

  it('reads a pre-S4.20 roster — fields absent, not null — as nulls rather than undefined', () => {
    const olderServer: MemberResponse = {
      travelerId: 'traveler-3',
      displayName: 'Cara Dee',
      avatarUrl: null,
      role: 'member',
      joinedAt: '2026-08-09T00:00:00Z',
    };

    expect(profileCardOfMember(olderServer)).toEqual({
      avatarUrl: null,
      displayName: 'Cara Dee',
      handle: null,
      bio: null,
      vanityNumber: null,
    });
  });
});

describe('the card outlives the window it is closing with (S4.20 addendum 3)', () => {
  it('keeps rendering the traveler the dialog was opened on while it tears down', () => {
    expect(stillShowing(null, MEMBER)).toBe(MEMBER);
  });

  it('prefers the live traveler over the retained one whenever there is one', () => {
    const other = { ...MEMBER, travelerId: 'traveler-9', displayName: 'Cara Dee' };

    expect(stillShowing(other, MEMBER)).toBe(other);
  });

  it('has nothing to show before a row has ever been tapped', () => {
    expect(stillShowing(null, null)).toBeNull();
  });
});

describe('email reaches no surface the card renders on', () => {
  const EMAIL = 'largata.dev+t1@gmail.com';

  it('keeps no email on the own-profile card, whatever the traveler set', () => {
    expect(JSON.stringify(profileCardOf(ME))).not.toContain(EMAIL);
    expect(JSON.stringify(profileCardOf(ME))).not.toContain('@gmail.com');
  });

  it('carries no key an email could ever be assigned to', () => {
    expect(Object.keys(profileCardOf(ME)).some((key) => /mail/i.test(key))).toBe(false);
    expect(Object.keys(profileCardOfMember(MEMBER)).some((key) => /mail/i.test(key))).toBe(false);
  });

  it('would fire if the email were put back — the check has a failure mode', () => {
    const withEmail = { ...profileCardOf(ME), email: ME.email };

    expect(JSON.stringify(withEmail)).toContain(EMAIL);
    expect(Object.keys(withEmail).some((key) => /mail/i.test(key))).toBe(true);
  });

  it('does not smuggle the email in as a display-name fallback', () => {
    const neverOnboarded = { ...ME, displayName: '', handle: null, bio: null };

    expect(JSON.stringify(profileCardOf(neverOnboarded))).not.toContain(EMAIL);
  });

  it('renders no email on any surface the card reaches (S4.20 decision 2, S4.21 profile page)', () => {
    const sources = [
      join(MOBILE_ROOT, 'src', 'profile', 'ProfileCardView.tsx'),
      join(MOBILE_ROOT, 'src', 'profile', 'ProfileHeader.tsx'),
      join(MOBILE_ROOT, 'src', 'profile', 'TravelerDialog.tsx'),
      join(MOBILE_ROOT, 'app', '(tabs)', '(profile)', 'profile.tsx'),
      join(MOBILE_ROOT, 'app', '(tabs)', '(profile)', 'account.tsx'),
    ];

    for (const path of sources) {
      expect(readFileSync(path, 'utf8')).not.toMatch(/\.email\b/);
    }
  });

  it('the profile header feeds its initials fallback a null second argument, never the email', () => {
    const header = readFileSync(join(MOBILE_ROOT, 'src', 'profile', 'ProfileHeader.tsx'), 'utf8');

    expect(header).toContain('initialsFor(card.displayName, null)');
  });

  it('the initials fallback is fed a null second argument, never the email (S4.20)', () => {
    const card = readFileSync(join(MOBILE_ROOT, 'src', 'profile', 'ProfileCardView.tsx'), 'utf8');

    expect(card).toContain('initialsFor(card.displayName, null)');
  });
});
