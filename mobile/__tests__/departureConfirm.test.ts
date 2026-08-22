import { askForConfirmation } from '../src/components/ConfirmStation';
import { confirmWith } from '../src/components/confirmDestructive';
import {
  CANCEL_LABEL,
  confirmDestructiveMessage,
  leaveTripWording,
  offerOwnershipWording,
  removeMemberWording,
  type ConfirmWording,
} from '../src/components/confirmDestructiveMessage';
import { missingItineraryMessage } from '../src/components/missingItineraryMessage';

jest.mock('../src/components/ConfirmStation', () => ({
  askForConfirmation: jest.fn(() => true),
}));

interface Asked {
  readonly wording: ConfirmWording;
  readonly title: string;
  readonly body: string;
  readonly onConfirm: () => void;
}

function asked(): Asked[] {
  return (askForConfirmation as jest.Mock).mock.calls.map(
    ([wording, onConfirm]: [ConfirmWording, () => void]) => ({
      wording,
      title: wording.title,
      body: wording.body,
      onConfirm,
    }),
  );
}

beforeEach(() => {
  (askForConfirmation as jest.Mock).mockClear();
});

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

describe('confirmWith hands the app-drawn dialog its wording', () => {
  it('asks before removing, and never acts on its own', () => {
    const onConfirm = jest.fn();

    confirmWith(removeMemberWording('Beto Cruz'), onConfirm);

    expect(onConfirm).not.toHaveBeenCalled();
    expect(asked()).toEqual([
      expect.objectContaining({
        title: 'Remove Beto Cruz?',
        body: expect.stringMatching(/messages, votes, and photos stay/i),
      }),
    ]);
  });

  it('runs the action only when the dialog reports a confirm', () => {
    const onConfirm = jest.fn();

    confirmWith(removeMemberWording('Beto Cruz'), onConfirm);
    asked()[0]?.onConfirm();

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('carries the wording labels the frames drew', () => {
    confirmWith(leaveTripWording(), jest.fn());

    expect(asked()[0]?.wording.confirmLabel).toBe('Leave');
    expect(asked()[0]?.wording.cancelLabel).toBe('Not yet');
  });

  it('leaves the cancel label unset when the wording does not name one, so the dialog defaults it', () => {
    confirmWith(removeMemberWording('@ana'), jest.fn());

    expect(asked()[0]?.wording.cancelLabel).toBeUndefined();
    expect(CANCEL_LABEL).toBe('Cancel');
  });

  it('keeps an accent confirm off the destructive tone — offering is not a loss', () => {
    confirmWith(offerOwnershipWording('@ana'), jest.fn());

    expect(asked()[0]?.wording.tone).toBe('accent');
  });

  it('marks a removal destructive rather than accent', () => {
    confirmWith(removeMemberWording('@ana'), jest.fn());

    expect(asked()[0]?.wording.tone).not.toBe('accent');
  });
});
