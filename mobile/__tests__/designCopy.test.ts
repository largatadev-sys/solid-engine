import { readFileSync } from 'fs';
import { join } from 'path';

// The onboarding copy is not ours to reword: it comes from the Figma CSS export the founder
// pasted (artifact ecb64a53). S4.0 shipped its own wording first, and the divergence was only
// noticed by eye. These assertions quote the export, so a rewrite has to be deliberate.
//
// Where the spec deliberately overrode the design, the override is asserted too - otherwise
// "match the design" would quietly reintroduce a dead Upload Photo control (decision 8), a ToS
// line pointing at documents that do not exist (decision 9), or a claim nothing has built
// (decision 6).

const MOBILE_ROOT = join(__dirname, '..');

function screen(...parts: string[]): string {
  return readFileSync(join(MOBILE_ROOT, ...parts), 'utf8');
}

describe('the onboarding copy is the export, verbatim', () => {
  it('welcome-landing', () => {
    const source = screen('app', 'welcome.tsx');

    expect(source).toContain('Largata');
    expect(source).toContain('Plan less. Experience more.');
    expect(source).not.toContain('Plan together. Travel better.');
  });

  it('verification', () => {
    const source = screen('app', 'verify-code.tsx');

    expect(source).toContain('Verify your email');
    expect(source).toContain('We sent a 6-digit code to your email address.');
    expect(source).toContain("Didn't receive code? ");
    expect(source).toContain('Resend code');
    expect(source).toContain('label="Verify"');
  });

  it('create-profile', () => {
    const source = screen('app', 'onboarding', 'profile.tsx');

    expect(source).toContain('label="Display Name"');
    expect(source).toContain('placeholder="e.g. Jane Doe"');
    expect(source).toContain('label="Username"');
    expect(source).toContain('prefix="@"');
    expect(source).toContain('placeholder="janedoe"');
    expect(source).toContain('label="Bio (Optional)"');
    expect(source).toContain('placeholder="Tell us about your travel style..."');
  });

  it('what-brings-you', () => {
    const source = screen('app', 'onboarding', 'goals.tsx');

    expect(source).toContain('What are you hoping to do?');
    expect(source).toContain('Select all that apply');
  });

  it('travel-preferences', () => {
    const source = screen('app', 'onboarding', 'interests.tsx');

    expect(source).toContain('What kind of trips interest you?');
    expect(source).toContain('Pick at least 3');
  });

  it('travel-setup', () => {
    const source = screen('app', 'onboarding', 'travel-setup.tsx');

    expect(source).toContain('Set up your travel profile');
    expect(source).toContain('label="Country / Region"');
    expect(source).toContain('label="Preferred Currency"');
    expect(source).toContain('label="Home City (Optional)"');
    expect(source).toContain('placeholder="e.g. Manila"');
  });
});

describe('the places the spec overrode the design stay overridden', () => {
  it('the camera badge is an empty-state affordance only — it never covers an uploaded photo', () => {
    const picker = screen('src', 'media', 'AvatarPicker.tsx');

    expect(picker).toMatch(/\{!hasPhoto && \(\s*<View style=\{styles\.badge\}>/);
  });

  it('no ToS consent line until the documents exist (decision 9)', () => {
    const signUp = screen('app', 'sign-up.tsx');

    expect(signUp).not.toMatch(/Terms of Service|Privacy Policy/i);
  });

  it('no "Discovery mode active" on the completion screen (decision 6)', () => {
    const summary = screen('src', 'onboarding', 'completionSummary.ts');

    expect(summary).not.toMatch(/discovery mode/i);
  });
});

describe('the currency reads as the export prints it', () => {
  it('carries the peso sign the paste mangled, not the mojibake', () => {
    const currencies = screen('src', 'itineraries', 'currencies.ts');

    expect(currencies).toContain("sign: '₱'");
    expect(currencies).not.toContain('â±');
  });

  it('keeps ONE currency vocabulary — the two overlapping maps collapsed at S4.25 decision 10', () => {
    const countries = screen('src', 'onboarding', 'countries.ts');

    expect(countries).not.toMatch(/CURRENCY_SYMBOLS/);
    expect(countries).not.toMatch(/currencyLabel/);
  });
});
