import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { diaryPaneState } from '../src/profile/diaryPaneState';

const MOBILE_ROOT = join(__dirname, '..');

const TAB = readFileSync(join(MOBILE_ROOT, 'src', 'profile', 'ProfileDiaryTab.tsx'), 'utf8');


describe('a failed diary load reads as a failure, never as an empty diary (S4.23)', () => {
  it('shows the spinner while the trips are still coming', () => {
    expect(diaryPaneState({ isPending: true, isError: false }, 0)).toBe('loading');
  });

  it('shows the error state when the fetch failed, even though it produced no rows', () => {
    expect(diaryPaneState({ isPending: false, isError: true }, 0)).toBe('failed');
  });

  it('shows the empty text only for a genuinely empty, successfully loaded diary', () => {
    expect(diaryPaneState({ isPending: false, isError: false }, 0)).toBe('empty');
  });

  it('shows the rows when there are rows', () => {
    expect(diaryPaneState({ isPending: false, isError: false }, 3)).toBe('rows');
  });

  it('prefers the failure over rows a stale cache may still be holding', () => {
    expect(diaryPaneState({ isPending: false, isError: true }, 3)).toBe('failed');
  });
});


describe('a failure does not merely reword the empty state — it has to look like one', () => {
  it('gives the failure the danger colour the screen-message precedent uses, not the muted meta grey', () => {
    const failed = TAB.slice(TAB.indexOf('failed: {'), TAB.indexOf('}', TAB.indexOf('failed: {')));

    expect(failed).toContain('colors.danger');
    expect(failed).not.toContain('profileColors.meta');
  });
});
