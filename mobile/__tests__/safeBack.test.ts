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

describe('alwaysBackTo — a screen that owns its exit (founder, 2026-08-04)', () => {
  it('goes to the named parent even when history exists', () => {
    expect(backAction(true, '/', true)).toEqual({ kind: 'replace', to: '/' });
  });

  it('is what stops the day editor unwinding into a preview visited earlier', () => {
    expect(backAction(true, '/', true)).not.toEqual({ kind: 'pop' });
  });

  it('is ignored when the screen names no parent — there is nothing to always go to', () => {
    expect(backAction(true, undefined, true)).toEqual({ kind: 'pop' });
  });

  it('leaves every other screen popping, so back still means back', () => {
    expect(backAction(true, '/itineraries/abc')).toEqual({ kind: 'pop' });
  });
});
