import { Alert } from 'react-native';
import { confirmWith } from '../src/components/confirmDestructive';
import {
  confirmDestructiveMessage,
  leaveTripWording,
  removeMemberWording,
} from '../src/components/confirmDestructiveMessage';
import { missingItineraryMessage } from '../src/components/missingItineraryMessage';

/**
 * The departure confirms (S1.5, ticket 02) and the wording both platform forks share.
 *
 * <p><strong>The same discipline as `editLockedAlert.test.ts`, and the same admitted gap.</strong> Jest
 * resolves `confirmDestructive` to the `.native` fork, so the assertions below exercise the `Alert`
 * path only. The `.web` fork exists because `Alert.alert` is a literal no-op on react-native-web — the
 * S1.3 dead-click trap, which shipped a whole screen of silent buttons — and no unit test in this file
 * can catch a regression there. That is why the wording lives in its own module (tested here, used by
 * both) and the web path is closed by driving the preview container with a `window.confirm`
 * interceptor in CDP (ticket 03).
 */

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

beforeEach(() => {
  (Alert.alert as jest.Mock).mockClear();
});

/** Invokes the affirmative button out of the native Alert's button array. */
function tapConfirm(): void {
  const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as {
    text: string;
    onPress?: () => void;
  }[];
  const affirmative = buttons.find((button) => button.text !== 'Cancel');
  affirmative?.onPress?.();
}

describe('the wording both forks share', () => {
  it('names the person being removed and says they can come back', () => {
    const { title, body, confirmLabel } = removeMemberWording('Beto Cruz');

    expect(title).toBe('Remove Beto Cruz?');
    expect(body).toMatch(/invite them again/i);
    expect(confirmLabel).toBe('Remove');
  });

  it('tells a leaver what they lose and that the way back is the owner', () => {
    // The asymmetry is the point: there is no self-service return, because invitation is the only
    // door into a workspace. A traveler deserves to know that before tapping, not after.
    const { title, body, confirmLabel } = leaveTripWording();

    expect(title).toBe('Leave this trip?');
    expect(body).toMatch(/lose access/i);
    expect(body).toMatch(/owner can invite you back/i);
    expect(confirmLabel).toBe('Leave');
  });

  it('never labels a destructive button "OK" — the word names the act', () => {
    // On a dialog whose whole job is a last chance, a generic affirmative is the reflexive tap.
    for (const wording of [removeMemberWording('Ana'), leaveTripWording(), confirmDestructiveMessage('Day 2')]) {
      expect(wording.confirmLabel).not.toMatch(/^(ok|yes)$/i);
    }
  });

  it('keeps the S1.3 delete wording working through the generalised shape', () => {
    // confirmDestructive's call sites (days, activities) predate S1.5 and must be untouched by it.
    const { title, body, confirmLabel } = confirmDestructiveMessage('Day 2 and everything in it');

    expect(title).toBe('Delete Day 2 and everything in it?');
    expect(body).toBe('This cannot be undone.');
    expect(confirmLabel).toBe('Delete');
  });
});

describe('the missing-trip copy an evicted member lands on', () => {
  it('asserts neither cause — the 404 masks two situations and the words must cover both', () => {
    // Artifact 03: "no such trip" and "not yours" are one answer by design. The copy may not claim
    // non-existence (false, and reads as data loss, for someone who was just removed) nor name removal
    // (that would leak that the id is real to anyone probing).
    const { title, body } = missingItineraryMessage;

    expect(body).toMatch(/no longer exists/i);
    expect(body).toMatch(/access/i);
    expect(title).not.toMatch(/not found/i);
    expect(`${title} ${body}`).not.toMatch(/removed|kicked|owner/i);
  });
});

describe('confirmWith (native fork)', () => {
  it('asks before removing, and only acts when the traveler confirms', () => {
    const onConfirm = jest.fn();

    confirmWith(removeMemberWording('Beto Cruz'), onConfirm);

    // Nothing has happened yet — the dialog is the whole point.
    expect(onConfirm).not.toHaveBeenCalled();
    const [title, body] = (Alert.alert as jest.Mock).mock.calls[0];
    expect(title).toBe('Remove Beto Cruz?');
    expect(body).toMatch(/invite them again/i);

    tapConfirm();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('does nothing at all when the traveler cancels', () => {
    const onConfirm = jest.fn();

    confirmWith(leaveTripWording(), onConfirm);
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as { text: string; style?: string }[];
    const cancel = buttons.find((button) => button.text === 'Cancel');
    expect(cancel?.style).toBe('cancel');

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('carries the wording label onto the affirmative button', () => {
    confirmWith(leaveTripWording(), jest.fn());

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as { text: string; style?: string }[];
    expect(buttons.map((button) => button.text)).toEqual(['Cancel', 'Leave']);
    expect(buttons[1]?.style).toBe('destructive');
  });
});
