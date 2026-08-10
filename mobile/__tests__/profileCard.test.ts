import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

  it('renders no email on either surface the card reaches (S4.20 decision 2)', () => {
    const card = readFileSync(join(MOBILE_ROOT, 'src', 'profile', 'ProfileCardView.tsx'), 'utf8');
    const ownProfile = readFileSync(join(MOBILE_ROOT, 'app', '(tabs)', 'profile.tsx'), 'utf8');
    const dialog = readFileSync(join(MOBILE_ROOT, 'src', 'profile', 'TravelerDialog.tsx'), 'utf8');

    for (const source of [card, ownProfile, dialog]) {
      expect(source).not.toMatch(/\.email\b/);
    }
  });

  it('the initials fallback is fed a null second argument, never the email (S4.20)', () => {
    const card = readFileSync(join(MOBILE_ROOT, 'src', 'profile', 'ProfileCardView.tsx'), 'utf8');

    expect(card).toContain('initialsFor(card.displayName, null)');
  });
});
