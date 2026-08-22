import { Alert } from 'react-native';
import { confirmWith } from '../src/components/confirmDestructive';
import {
  confirmDestructiveMessage,
  leaveTripWording,
  offerOwnershipWording,
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
  it('names the person being removed and promises their content stays (S4.28 frame 4)', () => {
    const { title, body, confirmLabel } = removeMemberWording('@betocruz');

    expect(title).toBe('Remove @betocruz?');
    expect(body).toBe(
      "They'll lose access to this trip. Their messages, votes, and photos stay.",
    );
    expect(confirmLabel).toBe('Remove');
  });

  it('tells a leaver what they lose and that what they made stays (S4.28 frame 5)', () => {
    const { title, body, confirmLabel, cancelLabel } = leaveTripWording();

    expect(title).toBe('Leave this trip?');
    expect(body).toBe(
      "You'll lose access to the plan, chat, and photos. Everything you added stays with the group.",
    );
    expect(confirmLabel).toBe('Leave');
    expect(cancelLabel).toBe('Not yet');
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
    expect(body).toMatch(/messages, votes, and photos stay/i);

    tapConfirm();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('does nothing at all when the traveler cancels', () => {
    const onConfirm = jest.fn();

    confirmWith(leaveTripWording(), onConfirm);
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as { text: string; style?: string }[];
    expect(buttons[0]?.style).toBe('cancel');

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('carries the wording label onto the affirmative button', () => {
    confirmWith(leaveTripWording(), jest.fn());

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as { text: string; style?: string }[];
    expect(buttons.map((button) => button.text)).toEqual(['Not yet', 'Leave']);
    expect(buttons[1]?.style).toBe('destructive');
  });

  it('defaults the cancel label when the wording does not name one', () => {
    confirmWith(removeMemberWording('@ana'), jest.fn());

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as { text: string; style?: string }[];
    expect(buttons.map((button) => button.text)).toEqual(['Cancel', 'Remove']);
  });

  it('keeps an accent confirm off the destructive style — offering is not a loss', () => {
    confirmWith(offerOwnershipWording('@ana'), jest.fn());

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as { text: string; style?: string }[];
    expect(buttons[1]?.text).toBe('Offer');
    expect(buttons[1]?.style).toBe('default');
  });
});
