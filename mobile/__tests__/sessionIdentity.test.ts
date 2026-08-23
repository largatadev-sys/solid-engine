import type { AuthState } from '../src/hooks/authContext';
import {
  SIGNED_OUT,
  cacheBelongsToSomebodyElse,
  observedTravelerOf,
} from '../src/auth/sessionIdentity';

const RESTORING: AuthState = { kind: 'restoring' };
const OUT: AuthState = { kind: 'signedOut' };

function signedIn(firebaseUid: string): AuthState {
  return { kind: 'signedIn', firebaseUid, emailVerified: true };
}

describe('what the cache is allowed to outlive', () => {
  it('observes nothing while auth is still restoring, so a cold start drops nothing', () => {
    expect(observedTravelerOf(RESTORING)).toBeNull();
    expect(cacheBelongsToSomebodyElse(null, observedTravelerOf(RESTORING))).toBe(false);
  });

  it('treats signed out as an identity of its own, so signing out drops the cache', () => {
    expect(cacheBelongsToSomebodyElse(observedTravelerOf(signedIn('t1')), observedTravelerOf(OUT)))
      .toBe(true);
  });

  it('drops the cache on an account switch even with no sign-out in between', () => {
    expect(
      cacheBelongsToSomebodyElse(observedTravelerOf(signedIn('t1')), observedTravelerOf(signedIn('t2'))),
    ).toBe(true);
  });

  it('keeps the cache when the same traveler is seen again', () => {
    expect(
      cacheBelongsToSomebodyElse(observedTravelerOf(signedIn('t1')), observedTravelerOf(signedIn('t1'))),
    ).toBe(false);
  });

  it('never drops on the way through restoring, which every foreground pass goes through', () => {
    const before = observedTravelerOf(signedIn('t1'));

    expect(cacheBelongsToSomebodyElse(before, observedTravelerOf(RESTORING))).toBe(false);
  });

  it('cannot collide with a real uid, because a Firebase uid carries no hyphen', () => {
    expect(SIGNED_OUT).toContain('-');
    expect(observedTravelerOf(signedIn('abc123XYZ'))).not.toBe(SIGNED_OUT);
  });
});
