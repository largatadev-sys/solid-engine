import { backAction } from '../src/navigation/safeBack';

describe('backAction — where "back" goes when there is no history', () => {
  it('pops the stack when there is something to pop', () => {
    expect(backAction(true, '/itineraries/abc')).toEqual({ kind: 'pop' });
  });

  it('replaces with the screen’s own parent when the stack is empty', () => {
    expect(backAction(false, '/itineraries/abc')).toEqual({
      kind: 'replace',
      to: '/itineraries/abc',
    });
  });

  it('falls back to Trips when a screen names no parent', () => {
    expect(backAction(false, undefined)).toEqual({ kind: 'replace', to: '/' });
  });

  it('still prefers the real history even when a parent is named — the previous page wins', () => {
    expect(backAction(true, '/')).toEqual({ kind: 'pop' });
  });
});

describe('back means the previous screen — no screen overrides it (founder, 2026-08-04)', () => {
  it('pops whatever the traveler actually came from, whichever screen that is', () => {
    for (const parent of ['/', '/itineraries/abc', undefined]) {
      expect(backAction(true, parent)).toEqual({ kind: 'pop' });
    }
  });

  it('uses the named parent ONLY when there is no history to pop — a deep link or cold start', () => {
    expect(backAction(false, '/itineraries/abc/days')).toEqual({
      kind: 'replace',
      to: '/itineraries/abc/days',
    });
  });
});
