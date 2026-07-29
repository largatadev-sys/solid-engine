import { Alert } from 'react-native';
import { confirmWith } from '../src/components/confirmDestructive';
import {
  confirmDestructiveMessage,
  leaveTripWording,
  removeMemberWording,
} from '../src/components/confirmDestructiveMessage';
import { missingItineraryMessage } from '../src/components/missingItineraryMessage';



jest.spyOn(Alert, 'alert').mockImplementation(() => {});

beforeEach(() => {
  (Alert.alert as jest.Mock).mockClear();
});


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
    const { title, body, confirmLabel } = leaveTripWording();

    expect(title).toBe('Leave this trip?');
    expect(body).toMatch(/lose access/i);
    expect(body).toMatch(/owner can invite you back/i);
    expect(confirmLabel).toBe('Leave');
  });

  it('never labels a destructive button "OK" — the word names the act', () => {
    for (const wording of [removeMemberWording('Ana'), leaveTripWording(), confirmDestructiveMessage('Day 2')]) {
      expect(wording.confirmLabel).not.toMatch(/^(ok|yes)$/i);
    }
  });

  it('keeps the S1.3 delete wording working through the generalised shape', () => {
    const { title, body, confirmLabel } = confirmDestructiveMessage('Day 2 and everything in it');

    expect(title).toBe('Delete Day 2 and everything in it?');
    expect(body).toBe('This cannot be undone.');
    expect(confirmLabel).toBe('Delete');
  });
});

describe('the missing-trip copy an evicted member lands on', () => {
  it('asserts neither cause — the 404 masks two situations and the words must cover both', () => {
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
