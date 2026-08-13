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


describe('the tab renders each state through the seam rather than inferring it from the row count', () => {
  it('asks the seam for the pane state instead of testing rows.length directly', () => {
    expect(TAB).toContain('diaryPaneState(trips, rows.length)');
    expect(TAB).not.toContain('rows.length === 0 ?');
  });

  it('offers a retry that refetches, on both the pane and the section', () => {
    expect(TAB).toContain('PROFILE_DIARY_RETRY_LABEL');
    expect(TAB).toContain('PROFILE_DIARY_SECTION_RETRY_LABEL');
    expect(TAB).toContain('void trips.refetch()');
    expect(TAB).toContain('void entries.refetch()');
  });

  it('renders an inline section error rather than an empty body when an expansion fails', () => {
    expect(TAB).toContain('diaryPaneState(entries, postcards.length)');
    expect(TAB).toContain('PROFILE_DIARY_SECTION_FAILED');
  });
});
