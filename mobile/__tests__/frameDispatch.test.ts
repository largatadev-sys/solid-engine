import { parseFrame } from '../src/ws/frameDispatch';

describe('parseFrame', () => {
  it('reads an event envelope', () => {
    const frame = parseFrame(
      JSON.stringify({
        topic: 'itinerary:t:chat',
        type: 'chat.message.appended',
        eventId: 'e1',
        at: '2026-08-20T10:00:00Z',
        payload: { id: 'm1' },
      }),
    );

    expect(frame).toEqual({
      kind: 'event',
      topic: 'itinerary:t:chat',
      type: 'chat.message.appended',
      eventId: 'e1',
      at: '2026-08-20T10:00:00Z',
      payload: { id: 'm1' },
    });
  });

  it('reads a subscribe acknowledgement', () => {
    expect(parseFrame(JSON.stringify({ action: 'subscribed', topic: 'debug:echo' }))).toEqual({
      kind: 'subscribed',
      topic: 'debug:echo',
    });
  });

  it('reads an unsubscribe acknowledgement', () => {
    expect(parseFrame(JSON.stringify({ action: 'unsubscribed', topic: 'debug:echo' }))).toEqual({
      kind: 'unsubscribed',
      topic: 'debug:echo',
    });
  });

  it('reads an error frame with its code', () => {
    expect(
      parseFrame(JSON.stringify({ action: 'error', code: 'TOPIC_NOT_FOUND', topic: 'x' })),
    ).toEqual({ kind: 'error', code: 'TOPIC_NOT_FOUND', topic: 'x' });
  });

  it('ignores an unknown action rather than throwing, so the server can grow', () => {
    expect(parseFrame(JSON.stringify({ action: 'presence', topic: 'x' }))).toBeNull();
  });

  it('ignores an envelope whose type it does not know, leaving the decision to the subscriber', () => {
    const frame = parseFrame(
      JSON.stringify({ topic: 'x', type: 'something.invented.later', eventId: 'e', at: 'now' }),
    );

    expect(frame).toEqual({
      kind: 'event',
      topic: 'x',
      type: 'something.invented.later',
      eventId: 'e',
      at: 'now',
      payload: undefined,
    });
  });

  it('tolerates malformed json rather than crashing the connection', () => {
    expect(parseFrame('not json')).toBeNull();
    expect(parseFrame('')).toBeNull();
  });

  it('tolerates a json value that is not an object', () => {
    expect(parseFrame('42')).toBeNull();
    expect(parseFrame('null')).toBeNull();
    expect(parseFrame('[1,2]')).toBeNull();
  });

  it('ignores a frame that is neither an envelope nor an action', () => {
    expect(parseFrame(JSON.stringify({ hello: 'world' }))).toBeNull();
  });
});
