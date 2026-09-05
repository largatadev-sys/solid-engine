import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  REMOVE_FOLLOWER_BODY,
  REMOVE_FOLLOWER_CONFIRM_LABEL,
  REMOVE_FOLLOWER_LABEL,
  removeFollowerTitle,
} from '../src/profile/privateProfileCopy';

const MOBILE_ROOT = join(__dirname, '..');

function read(...parts: string[]): string {
  return readFileSync(join(MOBILE_ROOT, ...parts), 'utf8');
}

const LIST = read('src', 'profile', 'FollowListScreen.tsx');
const SHEET = read('src', 'profile', 'FollowerSheet.tsx');
const ROW = read('src', 'profile', 'PersonRow.tsx');


describe('the kebab is earned, not rendered everywhere (S4.40 decision 10)', () => {
  it('comes from the one rule, so no screen decides for itself which rows carry it', () => {
    expect(LIST).toContain("rowAffordance(side, isSelf) === 'kebab'");
  });

  it('is handed to the row only when that rule says so', () => {
    expect(LIST).toContain('kebabs ? { onKebab: () => openSheet(item) } : {}');
  });

  it('is drawn by the row only when a handler was given — no handler, the chevron stays', () => {
    expect(ROW).toContain('onKebab !== undefined');
    expect(ROW).toContain('onKebab === undefined');
    expect(ROW).toContain('name="chevronRight"');
  });
});


describe('removing a follower asks first, and says it is one-way (frames 5b, 5c)', () => {
  it('goes sheet, then confirm, then the call — never straight from the kebab', () => {
    expect(SHEET).toContain('REMOVE_FOLLOWER_LABEL');
    expect(LIST).toContain('confirmWith(');
    expect(LIST).toContain('remove.mutate(person.id');
  });

  it('offers ONE row, and names the traveler once — the sheet titles itself', () => {
    expect(SHEET).toContain('title={handleLabel(shown)}');
    expect(SHEET).not.toContain('personLabel');
    expect(SHEET).not.toContain('MediaThumb');
  });

  it('offers no Dismiss row, because tapping off the sheet already dismisses it', () => {
    expect(SHEET).not.toContain('DISMISS');
    expect(SHEET.match(/<SheetRow/g) ?? []).toHaveLength(1);
  });

  it('names the traveler in the confirm and tells the truth about what follows', () => {
    expect(removeFollowerTitle('maya')).toBe('Remove @maya?');
    expect(REMOVE_FOLLOWER_BODY).toBe(
      "They won't be told, and they'll have to follow you again.",
    );
    expect(REMOVE_FOLLOWER_CONFIRM_LABEL).toBe('Remove');
    expect(REMOVE_FOLLOWER_LABEL).toBe('Remove follower');
  });

  it('offers no undo, which the canvas deliberately does not draw', () => {
    expect(LIST).not.toContain('UNDO_LABEL');
    expect(LIST).not.toContain('useRemovalQueue');
  });

  it('adopts the removal module existing failure toast rather than minting a string', () => {
    expect(LIST).toContain('failureToast(cause)');
  });

  it('derives its count line from the one rule, which knows not to subtract twice', () => {
    expect(LIST).toContain('shownFollowCount(');
  });
});
