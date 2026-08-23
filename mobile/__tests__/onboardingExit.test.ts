import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { STEP_NUMBERS } from '../src/onboarding/onboardingGate';

const ONBOARDING_DIR = join(__dirname, '..', 'app', 'onboarding');

const SHARED_SCREEN = join(__dirname, '..', 'src', 'components', 'OnboardingScreen.tsx');

function onboardingScreens(): string[] {
  return readdirSync(ONBOARDING_DIR).filter(
    (entry) => entry.endsWith('.tsx') && !entry.startsWith('_'),
  );
}

function sourceOf(screen: string): string {
  return readFileSync(join(ONBOARDING_DIR, screen), 'utf8');
}

function countedSteps(): string[] {
  return onboardingScreens().filter((screen) => sourceOf(screen).includes('STEP_NUMBERS.'));
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
    expect(sourceOf('complete.tsx')).toContain('landingOnTheWayOut');
  });

  it('spends the token on the way out, and does so in ONE place both exits share', () => {
    const shared = readFileSync(
      join(__dirname, '..', 'src', 'onboarding', 'leaveOnboarding.ts'),
      'utf8',
    );

    expect(shared).toContain('forgetPendingJoin');
    expect(shared).toContain('landingAfterSignIn');
  });
});

describe('the skip every counted step inherits', () => {
  it('scans for the counted steps rather than listing them', () => {
    expect(countedSteps().length).toBe(Object.keys(STEP_NUMBERS).length);
  });

  it.each(countedSteps())('%s declares a step, which is what carries the skip', (screen) => {
    expect(sourceOf(screen)).toMatch(/step=\{(editing \? undefined : )?STEP_NUMBERS\./);
  });

  it('defines the skip once, on the shared screen, so a new step inherits it untold', () => {
    const shared = readFileSync(SHARED_SCREEN, 'utf8');

    expect(shared).toContain('SKIP_LABEL');
    expect(shared).toContain('landingOnTheWayOut');
    expect(shared).toContain('trackOnboardingSkipped');
  });

  it('shows the skip only where a step is counted, so the celebration and edit mode have none', () => {
    expect(readFileSync(SHARED_SCREEN, 'utf8')).toContain('{step !== undefined && resuming && (');
    expect(sourceOf('complete.tsx')).not.toContain('step=');
  });

  it('offers it only to a traveler the gate dropped mid-flow — a fresh signup walks the whole thing', () => {
    const shared = readFileSync(SHARED_SCREEN, 'utf8');
    const skipBlock = shared.slice(shared.indexOf('{step !== undefined'), shared.indexOf('</Pressable>'));

    expect(skipBlock).toContain('resuming');
    expect(shared).toContain('resuming = false');
  });

  it.each(countedSteps())('%s does not hand-roll its own skip', (screen) => {
    expect(sourceOf(screen)).not.toContain('SKIP_LABEL');
  });
});
