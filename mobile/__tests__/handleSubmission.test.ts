import { profileSaveFor } from '../src/onboarding/handleSubmission';
import type { MeResponse } from '../src/types/api';

const ME: MeResponse = {
  id: 'traveler-1',
  displayName: 'Founder',
  email: 'largata.dev+t1@gmail.com',
  handle: 'ea',
  suggestedHandle: 'ea',
  avatarUrl: null,
  bio: null,
  goals: [],
  interests: [],
  country: 'PH',
  preferredCurrency: 'PHP',
  homeCity: 'Puerto Princesa',
  onboardingCompleted: true,
  vanityNumber: '0',
  profileVisibility: 'public',
};

const TYPED = { handle: 'ea', displayName: 'Founder', bio: 'Building Largata.' };

describe('what a profile save actually sends', () => {
  it('omits the handle entirely when it was not edited', () => {
    const request = profileSaveFor(TYPED, ME);

    expect(request).not.toHaveProperty('handle');
    expect(request.displayName).toBe('Founder');
  });

  it('sends the handle when it was edited', () => {
    const request = profileSaveFor({ ...TYPED, handle: 'eaglet' }, ME);

    expect(request.handle).toBe('eaglet');
  });

  it('sends the handle for a traveler claiming their first one', () => {
    const request = profileSaveFor({ ...TYPED, handle: 'anasilva' }, { ...ME, handle: null });

    expect(request.handle).toBe('anasilva');
  });

  it('omits nothing but the handle, so the rest of the profile still saves', () => {
    const request = profileSaveFor({ ...TYPED, bio: '  spaced  ' }, ME);

    expect(request.bio).toBe('spaced');
    expect(request.displayName).toBe('Founder');
  });

  it('sends the handle when there is no traveler loaded yet', () => {
    const request = profileSaveFor({ ...TYPED, handle: 'anasilva' }, null);

    expect(request.handle).toBe('anasilva');
  });
});
