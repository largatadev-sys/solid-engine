import {
  asThreadMessages,
  beginSend,
  bodyOf,
  markFailed,
  markRetrying,
  settle,
  withoutAlreadyConfirmed,
  type PendingSends,
} from '../src/chat/pendingSends';
import {
  clearDraft,
  forgetEveryDraft,
  readDraft,
  writeDraft,
} from '../src/chat/draftStore';
import { MAX_MESSAGE_LENGTH } from '../src/chat/chatThread';


const AT = '2026-03-03T09:00:00.000Z';


describe('the send state machine (C5)', () => {

  it('appends optimistically as pending on release', () => {
    const pending = beginSend([], 'local-1', 'Ordering coffees', AT);

    expect(pending).toEqual([
      { localId: 'local-1', body: 'Ordering coffees', at: AT, state: 'pending' },
    ]);
  });


  it('settles a confirmed send out of the pending list entirely', () => {
    const pending = beginSend([], 'local-1', 'Ordering coffees', AT);

    expect(settle(pending, 'local-1')).toEqual([]);
  });


  it('holds a failed send in place rather than dropping it', () => {
    const failed = markFailed(beginSend([], 'local-1', 'Ordering coffees', AT), 'local-1');

    expect(failed).toHaveLength(1);
    expect(failed[0]).toMatchObject({ state: 'failed', body: 'Ordering coffees' });
  });


  it('retries the same body in place, never a fresh entry', () => {
    const failed = markFailed(beginSend([], 'local-1', 'Ordering coffees', AT), 'local-1');
    const retrying = markRetrying(failed, 'local-1');

    expect(retrying).toHaveLength(1);
    expect(retrying[0]).toMatchObject({ localId: 'local-1', state: 'pending' });
    expect(bodyOf(retrying, 'local-1')).toBe('Ordering coffees');
  });


  it('removes a settled send and leaves its neighbours alone', () => {
    const two = beginSend(beginSend([], 'local-1', 'First', AT), 'local-2', 'Second', AT);

    expect(settle(markFailed(two, 'local-1'), 'local-1').map((entry) => entry.localId)).toEqual([
      'local-2',
    ]);
  });


  it('walks the whole graph without ever leaving a stranded entry', () => {
    let pending: PendingSends = beginSend([], 'local-1', 'First', AT);
    pending = markFailed(pending, 'local-1');
    pending = markRetrying(pending, 'local-1');
    pending = settle(pending, 'local-1');

    expect(pending).toEqual([]);
  });


  it('knows nothing of a localId it never held', () => {
    expect(bodyOf([], 'ghost')).toBeNull();
    expect(settle([], 'ghost')).toEqual([]);
  });


  it('renders pending sends as the viewer own bubbles, carrying their state', () => {
    const pending = markFailed(beginSend([], 'local-1', 'Ordering coffees', AT), 'local-1');

    expect(asThreadMessages(pending, 'maya')).toEqual([
      {
        id: 'local-1',
        authorId: 'maya',
        handle: null,
        displayName: null,
        body: 'Ordering coffees',
        at: AT,
        mine: true,
        state: 'failed',
      },
    ]);
  });
});


describe('the optimistic entry yields to its own broadcast (AC 2)', () => {

  function confirmed(body: string, mine: boolean) {
    return {
      id: 'server-1',
      authorId: 'maya',
      handle: 'mayasantos',
      displayName: 'Maya Santos',
      body,
      at: AT,
      mine,
      state: 'confirmed' as const,
    };
  }


  it('drops the pending twin the instant the broadcast beats the POST response', () => {
    const pending = beginSend([], 'local-1', 'Ordering coffees', AT);

    expect(withoutAlreadyConfirmed(pending, [confirmed('Ordering coffees', true)])).toEqual([]);
  });


  it('keeps the pending entry while nothing confirmed matches it', () => {
    const pending = beginSend([], 'local-1', 'Ordering coffees', AT);

    expect(withoutAlreadyConfirmed(pending, [confirmed('Something else', true)])).toHaveLength(1);
  });


  it('never lets somebody else identical message swallow my pending bubble', () => {
    const pending = beginSend([], 'local-1', 'Ordering coffees', AT);

    expect(
      withoutAlreadyConfirmed(pending, [confirmed('Ordering coffees', false)]),
    ).toHaveLength(1);
  });


  it('holds a FAILED send even when an identical message is confirmed', () => {
    const failed = markFailed(beginSend([], 'local-1', 'Ordering coffees', AT), 'local-1');

    expect(withoutAlreadyConfirmed(failed, [confirmed('Ordering coffees', true)]))
      .toHaveLength(1);
  });


  it('retires ONE twin per confirmed message, so a repeated send does not vanish', () => {
    const twice = beginSend(beginSend([], 'local-1', 'ok', AT), 'local-2', 'ok', AT);

    expect(
      withoutAlreadyConfirmed(twice, [confirmed('ok', true)]).map((send) => send.localId),
    ).toEqual(['local-2']);
  });


  it('retires both twins once both are confirmed', () => {
    const twice = beginSend(beginSend([], 'local-1', 'ok', AT), 'local-2', 'ok', AT);

    expect(
      withoutAlreadyConfirmed(twice, [confirmed('ok', true), confirmed('ok', true)]),
    ).toEqual([]);
  });
});


describe('the per-trip draft store (C4)', () => {

  beforeEach(() => forgetEveryDraft());

  it('holds a draft per trip and hands it back on return', () => {
    writeDraft('trip-a', 'Half a thought');
    writeDraft('trip-b', 'A different trip');

    expect(readDraft('trip-a')).toBe('Half a thought');
    expect(readDraft('trip-b')).toBe('A different trip');
  });


  it('survives the component that wrote it, because it is module-scoped', () => {
    writeDraft('trip-a', 'Half a thought');

    expect(readDraft('trip-a')).toBe('Half a thought');
  });


  it('answers empty for a trip nobody has typed in', () => {
    expect(readDraft('trip-unknown')).toBe('');
  });


  it('caps the draft at the store boundary, not only in the field', () => {
    expect(writeDraft('trip-a', 'x'.repeat(2_400))).toHaveLength(MAX_MESSAGE_LENGTH);
    expect(readDraft('trip-a')).toHaveLength(MAX_MESSAGE_LENGTH);
  });


  it('forgets a trip draft when it is cleared, as archiving does', () => {
    writeDraft('trip-a', 'Half a thought');
    clearDraft('trip-a');

    expect(readDraft('trip-a')).toBe('');
  });


  it('treats an emptied field as no draft at all', () => {
    writeDraft('trip-a', 'Half a thought');

    expect(writeDraft('trip-a', '')).toBe('');
    expect(readDraft('trip-a')).toBe('');
  });
});
