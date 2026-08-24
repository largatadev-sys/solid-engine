import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { shouldRevalidate, type RevalidationSubject } from '../src/query/revalidateOnFocus';

const MOBILE_ROOT = join(__dirname, '..');

function subject(overrides: Partial<RevalidationSubject> = {}): RevalidationSubject {
  return { enabled: true, isPending: false, isFetching: false, ...overrides };
}

describe('focus revalidation asks for fresh data without ever showing a spinner (S4.34)', () => {
  it('revalidates a settled query — the whole point of the story', () => {
    expect(shouldRevalidate(subject())).toBe(true);
  });

  it('declines while the query is still pending — a refetch there enters a loading state', () => {
    expect(shouldRevalidate(subject({ isPending: true }))).toBe(false);
  });

  it('declines while a fetch is already in flight — focus must not stack requests', () => {
    expect(shouldRevalidate(subject({ isFetching: true }))).toBe(false);
  });

  it('declines a disabled query — a signed-out screen has nothing to revalidate', () => {
    expect(shouldRevalidate(subject({ enabled: false }))).toBe(false);
  });

  it('declines a pending query even when nothing is in flight — pending is the spinner state', () => {
    expect(shouldRevalidate(subject({ isPending: true, isFetching: false }))).toBe(false);
  });
});

describe('the helper is the only copy of this pattern (S4.34 ticket 02)', () => {
  it('reaches for the shared hook rather than hand-rolling useFocusEffect + refetch', () => {
    const hook = readFileSync(join(MOBILE_ROOT, 'src', 'query', 'useRevalidateOnFocus.ts'), 'utf8');
    expect(hook).toMatch(/shouldRevalidate/);
    expect(hook).toMatch(/useFocusEffect/);
  });
});

describe('the helper fires ONCE per focus, not once per query state change (S4.34)', () => {
  const HOOK = readFileSync(
    join(MOBILE_ROOT, 'src', 'query', 'useRevalidateOnFocus.ts'),
    'utf8',
  );

  it('arms the focus effect with an EMPTY dependency list', () => {
    const effect = HOOK.slice(HOOK.indexOf('useFocusEffect'));
    expect(effect).toMatch(/\}, \[\]\)/);
  });

  it('never puts the query flags in the dep list — each transition would re-fire the effect', () => {
    const effect = HOOK.slice(HOOK.indexOf('useFocusEffect'));
    const deps = effect.slice(effect.lastIndexOf('}, ['));

    expect(deps).not.toMatch(/isFetching/);
    expect(deps).not.toMatch(/isPending/);
    expect(deps).not.toMatch(/refetch/);
  });

  it('reads the live query through a ref, so an empty dep list is still correct', () => {
    expect(HOOK).toMatch(/useRef\(/);
    expect(HOOK).toMatch(/latest\.current/);
  });
});
