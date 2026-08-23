import { ONBOARDING_ROUTES } from '../src/onboarding/onboardingGate';
import {
  enteredMidFlow,
  forgetOnboardingEntry,
  noteOnboardingEntry,
} from '../src/onboarding/resumeNotice';

beforeEach(() => forgetOnboardingEntry());

describe('who is told they are resuming', () => {
  it('nobody, before the gate has routed anyone anywhere', () => {
    expect(enteredMidFlow()).toBe(false);
  });

  it('a traveler the gate drops past the first step', () => {
    noteOnboardingEntry(ONBOARDING_ROUTES.interests);

    expect(enteredMidFlow()).toBe(true);
  });

  it('not a traveler starting at the first step, which is a beginning and not a resume', () => {
    noteOnboardingEntry(ONBOARDING_ROUTES.profile);

    expect(enteredMidFlow()).toBe(false);
  });

  it('and NOT a traveler walking straight through, because only the gate reports an entry', () => {
    noteOnboardingEntry(ONBOARDING_ROUTES.profile);
    noteOnboardingEntry('/trips');

    expect(enteredMidFlow()).toBe(false);
  });

  it('every counted step past the first counts as a resume when the gate lands there', () => {
    for (const route of [
      ONBOARDING_ROUTES.goals,
      ONBOARDING_ROUTES.interests,
      ONBOARDING_ROUTES.travelSetup,
      ONBOARDING_ROUTES.complete,
    ]) {
      forgetOnboardingEntry();
      noteOnboardingEntry(route);

      expect(enteredMidFlow()).toBe(true);
    }
  });

  it('is forgotten on the way out, so the next sign-in starts unmarked', () => {
    noteOnboardingEntry(ONBOARDING_ROUTES.travelSetup);
    forgetOnboardingEntry();

    expect(enteredMidFlow()).toBe(false);
  });

  it('ignores a destination outside onboarding entirely', () => {
    noteOnboardingEntry('/join/abc');

    expect(enteredMidFlow()).toBe(false);
  });
});
