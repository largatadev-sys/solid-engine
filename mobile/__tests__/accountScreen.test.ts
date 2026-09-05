import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  GO_PUBLIC_BODY,
  GO_PUBLIC_CONFIRM_LABEL,
  GO_PUBLIC_TITLE,
  PRIVATE_PROFILE_HELPER,
  VISIBILITY_FAILED_TOAST,
} from '../src/profile/privateProfileCopy';

const MOBILE_ROOT = join(__dirname, '..');

const SCREEN = readFileSync(
  join(MOBILE_ROOT, 'app', '(tabs)', '(profile)', 'account.tsx'),
  'utf8',
);
const SWITCH = readFileSync(join(MOBILE_ROOT, 'src', 'profile', 'VisibilitySwitch.tsx'), 'utf8');


describe('the Account screen is rows now (S4.40 decision 8, frames 3a/3b)', () => {
  it('carries no identity card and no wordmark — the Profile tab shows identity one tap back', () => {
    expect(SCREEN).not.toContain('ProfileCardView');
    expect(SCREEN).not.toContain('profileCardOf');
    expect(SCREEN).not.toContain('Largata');
    expect(SCREEN).not.toContain('SIGNED IN');
  });

  it('offers neither My Trips nor Reload, which the founder retired', () => {
    expect(SCREEN).not.toContain('My Trips');
    expect(SCREEN).not.toContain('Reload');
  });

  it('builds its rows from the one rule, so the requests row cannot drift out of step', () => {
    expect(SCREEN).toContain('accountRows(visibility)');
  });
});


describe('the switch saves on flip, and asks in one direction (C3, M6)', () => {
  it('patches only the one field, so nothing else on the profile is rewritten', () => {
    expect(SCREEN).toContain('{ profileVisibility: next }');
  });

  it('shows the traveler the new state before the server answers, and reverts on failure', () => {
    expect(SCREEN).toContain('setPending(next)');
    expect(SCREEN).toContain('setToast(VISIBILITY_FAILED_TOAST)');
    expect(SCREEN).toContain('pending ?? served');
  });

  it('confirms through the shared station, so the web harness auto-accepts and prints it', () => {
    expect(SCREEN).toContain('confirmWith(');
    expect(SCREEN).toContain('confirmsFlip(visibility)');
    expect(GO_PUBLIC_TITLE).toBe('Make your profile public?');
    expect(GO_PUBLIC_BODY).toContain('approves anyone who has asked');
    expect(GO_PUBLIC_CONFIRM_LABEL).toBe('Go public');
  });

  it('looks nothing up before confirming — the wording is true whether or not anyone waits', () => {
    expect(SCREEN).not.toContain('useFollowRequests');
    expect(SCREEN).not.toContain('requestCount');
  });

  it('slides rather than swapping, and stops sliding under Reduce Motion (M6)', () => {
    expect(SWITCH).toContain('switchTrackMs');
    expect(SWITCH).toContain('Easing.bezier(0.2, 0, 0, 1)');
    expect(SWITCH).toContain('useReducedMotion');
    expect(SWITCH).toContain('slide.setValue(on ? 1 : 0)');
  });

  it('states the consequence in the helper, published itineraries included', () => {
    expect(PRIVATE_PROFILE_HELPER).toBe(
      'Only followers you approve can see your postcards and who you follow. Your published itineraries stay public.',
    );
    expect(VISIBILITY_FAILED_TOAST).toBe("Couldn't change your profile visibility");
  });
});
