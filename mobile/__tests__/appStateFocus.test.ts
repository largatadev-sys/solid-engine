import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isAppFocused } from '../src/query/useAppStateFocus.native';

const MOBILE_ROOT = join(__dirname, '..');

const ROOT_LAYOUT = readFileSync(join(MOBILE_ROOT, 'app', '_layout.tsx'), 'utf8');
const NATIVE = readFileSync(join(MOBILE_ROOT, 'src', 'query', 'useAppStateFocus.native.ts'), 'utf8');
const WEB = readFileSync(join(MOBILE_ROOT, 'src', 'query', 'useAppStateFocus.web.ts'), 'utf8');

describe('the app tells react-query when it is being looked at (S4.34 ticket 01)', () => {
  it('counts only the active state as focused', () => {
    expect(isAppFocused('active')).toBe(true);
  });

  it('counts background and inactive as unfocused — a pocketed phone reads nothing', () => {
    expect(isAppFocused('background')).toBe(false);
    expect(isAppFocused('inactive')).toBe(false);
  });

  it('drives focusManager from AppState on native, the same lifecycle the socket already watches', () => {
    expect(NATIVE).toMatch(/focusManager\.setFocused/);
    expect(NATIVE).toMatch(/AppState\.addEventListener\(\s*'change'/);
  });

  it('releases its claim on unmount, so react-query returns to its own default', () => {
    expect(NATIVE).toMatch(/subscription\.remove\(\)/);
    expect(NATIVE).toMatch(/focusManager\.setFocused\(undefined\)/);
  });

  it('declines on web, where react-query already tracks window focus itself', () => {
    expect(WEB).not.toMatch(/focusManager/);
    expect(WEB).not.toMatch(/from 'react-native'/);
  });

  it('is mounted by the root layout beside the socket lifecycle', () => {
    expect(ROOT_LAYOUT).toMatch(/useAppStateFocus\(\)/);
    expect(ROOT_LAYOUT).toMatch(/from '\.\.\/src\/query\/useAppStateFocus'/);
  });
});
