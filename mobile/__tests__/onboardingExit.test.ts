import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ONBOARDING_DIR = join(__dirname, '..', 'app', 'onboarding');

function onboardingScreens(): string[] {
  return readdirSync(ONBOARDING_DIR).filter(
    (entry) => entry.endsWith('.tsx') && !entry.startsWith('_'),
  );
}

function sourceOf(screen: string): string {
  return readFileSync(join(ONBOARDING_DIR, screen), 'utf8');
}

describe('the way out of onboarding', () => {
  it('finds the onboarding screens by scanning, so a new one cannot escape this test', () => {
    expect(onboardingScreens()).toEqual(
      expect.arrayContaining(['complete.tsx', 'profile.tsx', 'interests.tsx', 'travel-setup.tsx']),
    );
  });

  it.each(onboardingScreens())('%s never routes to Home on its own authority', (screen) => {
    expect(sourceOf(screen)).not.toContain('SIGNED_IN_HOME');
  });

  it('sends the finishing traveler wherever the gate would have sent them', () => {
    expect(sourceOf('complete.tsx')).toContain('landingAfterSignIn');
  });

  it('spends the token on the way out, so a stale link cannot divert a later sign-in', () => {
    expect(sourceOf('complete.tsx')).toContain('forgetPendingJoin');
  });
});
