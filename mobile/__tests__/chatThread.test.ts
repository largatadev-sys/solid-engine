import {
  MAX_MESSAGE_LENGTH,
  authorLabel,
  avatarLabel,
  canSend,
  clampToCap,
  counterState,
  linesFilled,
  mergeById,
  threadRows,
  tintIndexFor,
  toThreadMessage,
  type ThreadMessage,
} from '../src/chat/chatThread';
import type { ChatMessageResponse } from '../src/types/api';


function message(overrides: Partial<ThreadMessage> & { id: string; at: string }): ThreadMessage {
  return {
    authorId: 'maya',
    handle: 'mayasantos',
    displayName: 'Maya Santos',
    body: 'Booked the van.',
    mine: false,
    state: 'confirmed',
    ...overrides,
  };
}


function at(day: number, hour: number, minute: number): string {
  return new Date(2026, 2, day, hour, minute).toISOString();
}


describe('grouping (C1)', () => {

  it('groups consecutive messages from one sender inside the five-minute window', () => {
    const rows = threadRows(
      [
        message({ id: 'a', at: at(3, 9, 0) }),
        message({ id: 'b', at: at(3, 9, 4) }),
      ],
      new Date(2026, 2, 3, 12, 0),
    );

    const messages = rows.filter((row) => row.kind === 'message');
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ startsGroup: true, endsGroup: false });
    expect(messages[1]).toMatchObject({ startsGroup: false, endsGroup: true });
  });


  it('breaks the group once five minutes have passed', () => {
    const rows = threadRows(
      [
        message({ id: 'a', at: at(3, 9, 0) }),
        message({ id: 'b', at: at(3, 9, 5) }),
      ],
      new Date(2026, 2, 3, 12, 0),
    );

    const messages = rows.filter((row) => row.kind === 'message');
    expect(messages[0]).toMatchObject({ endsGroup: true });
    expect(messages[1]).toMatchObject({ startsGroup: true });
  });


  it('never groups across senders however close together they are', () => {
    const rows = threadRows(
      [
        message({ id: 'a', authorId: 'maya', at: at(3, 9, 0) }),
        message({ id: 'b', authorId: 'jose', at: at(3, 9, 0) }),
      ],
      new Date(2026, 2, 3, 12, 0),
    );

    const messages = rows.filter((row) => row.kind === 'message');
    expect(messages[0]).toMatchObject({ endsGroup: true });
    expect(messages[1]).toMatchObject({ startsGroup: true });
  });


  it('a separator between two of one senders messages breaks the group', () => {
    const rows = threadRows(
      [
        message({ id: 'a', at: at(3, 23, 58) }),
        message({ id: 'b', at: at(4, 0, 1) }),
      ],
      new Date(2026, 2, 4, 12, 0),
    );

    const messages = rows.filter((row) => row.kind === 'message');
    expect(messages[1]).toMatchObject({ startsGroup: true });
  });
});


describe('gap timestamps and date separators (C3)', () => {

  it('shows a centered timestamp only once the gap reaches twenty minutes', () => {
    const rows = threadRows(
      [
        message({ id: 'a', at: at(3, 9, 0) }),
        message({ id: 'b', at: at(3, 9, 19) }),
        message({ id: 'c', at: at(3, 9, 39) }),
      ],
      new Date(2026, 2, 3, 12, 0),
    );

    expect(rows.filter((row) => row.kind === 'timestamp')).toHaveLength(1);
  });


  it('opens the thread with a date separator and adds one per calendar day', () => {
    const rows = threadRows(
      [
        message({ id: 'a', at: at(3, 9, 0) }),
        message({ id: 'b', at: at(4, 9, 0) }),
      ],
      new Date(2026, 2, 5, 12, 0),
    );

    expect(rows.filter((row) => row.kind === 'date')).toHaveLength(2);
  });


  it('names today and yesterday, and spells any older day out', () => {
    const now = new Date(2026, 2, 5, 12, 0);

    const labelFor = (day: number) =>
      threadRows([message({ id: 'a', at: at(day, 9, 0) })], now).find(
        (row) => row.kind === 'date',
      );

    expect(labelFor(5)).toMatchObject({ label: 'Today' });
    expect(labelFor(4)).toMatchObject({ label: 'Yesterday' });
    expect(labelFor(3)).toMatchObject({ label: expect.stringContaining('March') });
  });


  it('never emits a timestamp where a date separator already broke the day', () => {
    const rows = threadRows(
      [
        message({ id: 'a', at: at(3, 23, 0) }),
        message({ id: 'b', at: at(4, 9, 0) }),
      ],
      new Date(2026, 2, 4, 12, 0),
    );

    expect(rows.filter((row) => row.kind === 'timestamp')).toHaveLength(0);
    expect(rows.filter((row) => row.kind === 'date')).toHaveLength(2);
  });
});


describe('the composer counter (C4)', () => {

  it('stays invisible until 1,900 characters', () => {
    expect(counterState(1_899).visible).toBe(false);
    expect(counterState(1_900).visible).toBe(true);
  });


  it('turns red only at the hard cap', () => {
    expect(counterState(1_999).atCap).toBe(false);
    expect(counterState(2_000).atCap).toBe(true);
  });


  it('reads as the canvas frame does', () => {
    expect(counterState(1_968).label).toBe('1,968 / 2,000');
  });


  it('refuses a whitespace-only draft and accepts anything else', () => {
    expect(canSend('')).toBe(false);
    expect(canSend('   \n  ')).toBe(false);
    expect(canSend(' hi ')).toBe(true);
  });


  it('hard-stops input at the cap rather than refusing the keystroke later', () => {
    expect(clampToCap('x'.repeat(2_050))).toHaveLength(MAX_MESSAGE_LENGTH);
    expect(clampToCap('short')).toBe('short');
  });
});


describe('composer growth (C4, M3) — the measurement includes padding', () => {

  const LINE = 19;
  const PAD = 10;
  const MAX = 3;
  const forHeight = (height: number) => linesFilled(height, LINE, PAD, MAX);

  it('reads an EMPTY field as one line, not two', () => {
    expect(forHeight(LINE + PAD * 2)).toBe(1);
  });


  it('grows a line at a time as the text wraps', () => {
    expect(forHeight(LINE * 2 + PAD * 2)).toBe(2);
    expect(forHeight(LINE * 3 + PAD * 2)).toBe(3);
  });


  it('caps at three lines however long the message runs', () => {
    expect(forHeight(LINE * 4 + PAD * 2)).toBe(MAX);
    expect(forHeight(LINE * 40 + PAD * 2)).toBe(MAX);
  });


  it('never collapses below one line, whatever it is handed', () => {
    expect(forHeight(0)).toBe(1);
    expect(forHeight(PAD * 2)).toBe(1);
    expect(forHeight(-50)).toBe(1);
    expect(forHeight(Number.NaN)).toBe(1);
  });
});


describe('author identity (C2)', () => {

  it('renders the handle with its at-sign, falling back to the display name', () => {
    expect(authorLabel(message({ id: 'a', at: at(3, 9, 0) }))).toBe('@mayasantos');
    expect(
      authorLabel(message({ id: 'a', at: at(3, 9, 0), handle: null })),
    ).toBe('Maya Santos');
  });


  it('still names a departed author whose profile is bare', () => {
    expect(
      authorLabel(message({ id: 'a', at: at(3, 9, 0), handle: null, displayName: null })),
    ).toBe('Someone');
  });


  it('takes initials from the display name, then the handle', () => {
    expect(avatarLabel(message({ id: 'a', at: at(3, 9, 0) }))).toBe('MS');
    expect(
      avatarLabel(message({ id: 'a', at: at(3, 9, 0), displayName: null })),
    ).toBe('M');
  });


  it('assigns a stable tint per traveler, inside the palette', () => {
    const first = tintIndexFor('traveler-one', 6);
    expect(tintIndexFor('traveler-one', 6)).toBe(first);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(6);
  });


  it('survives an empty palette rather than dividing by zero', () => {
    expect(tintIndexFor('traveler-one', 0)).toBe(0);
  });
});


describe('merging the socket into the thread', () => {

  function wire(id: string, isoAt: string): ChatMessageResponse {
    return {
      id,
      author: { travelerId: 'maya', handle: 'mayasantos', displayName: 'Maya Santos' },
      body: 'Hello',
      at: isoAt,
    };
  }


  it('marks the viewer own messages and nobody else', () => {
    expect(toThreadMessage(wire('a', at(3, 9, 0)), 'maya').mine).toBe(true);
    expect(toThreadMessage(wire('a', at(3, 9, 0)), 'jose').mine).toBe(false);
    expect(toThreadMessage(wire('a', at(3, 9, 0)), null).mine).toBe(false);
  });


  it('deduplicates by id so a sender own broadcast never double-renders', () => {
    const existing = [message({ id: 'a', at: at(3, 9, 0) })];
    const merged = mergeById(existing, [message({ id: 'a', at: at(3, 9, 0), body: 'Edited' })]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.body).toBe('Edited');
  });


  it('orders an out-of-order arrival into the thread by time', () => {
    const merged = mergeById(
      [message({ id: 'b', at: at(3, 9, 5) })],
      [message({ id: 'a', at: at(3, 9, 0) })],
    );

    expect(merged.map((entry) => entry.id)).toEqual(['a', 'b']);
  });


  it('reads a departed author as unattributed rather than crashing', () => {
    const departed: ChatMessageResponse = {
      id: 'a',
      author: null,
      body: 'Still here',
      at: at(3, 9, 0),
    };

    expect(toThreadMessage(departed, 'maya')).toMatchObject({ handle: null, mine: false });
  });
});
