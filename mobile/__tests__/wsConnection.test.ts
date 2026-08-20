

jest.mock('../src/api/apiClient', () => ({
  apiClient: { post: jest.fn() },
  baseUrl: () => 'http://localhost:8080',
}));

type Handler = (event?: unknown) => void;

class FakeSocket {
  static opened: FakeSocket[] = [];

  static at(index: number): FakeSocket {
    const socket = FakeSocket.opened[index];
    if (socket === undefined) throw new Error(`No socket was opened at index `);
    return socket;
  }

  onopen: Handler | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: Handler | null = null;
  onclose: Handler | null = null;
  readonly sent: string[] = [];
  closed = false;

  constructor(readonly url: string) {
    FakeSocket.opened.push(this);
  }

  send(frame: string): void {
    this.sent.push(frame);
  }

  close(): void {
    this.closed = true;
    this.onclose?.();
  }

  open(): void {
    this.onopen?.();
  }

  deliver(frame: unknown): void {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }

  actions(): string[] {
    return this.sent.map((frame) => (JSON.parse(frame) as { action: string }).action);
  }

  topics(): string[] {
    return this.sent.map((frame) => (JSON.parse(frame) as { topic: string }).topic);
  }
}

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const CHAT = 'itinerary:t1:chat';

let connection: typeof import('../src/ws/connection');


let post: jest.Mock;

beforeEach(() => {
  jest.useFakeTimers();
  FakeSocket.opened = [];
  (globalThis as { WebSocket?: unknown }).WebSocket = FakeSocket;
  jest.resetModules();
  post = (require('../src/api/apiClient') as typeof import('../src/api/apiClient'))
    .apiClient.post as unknown as jest.Mock;
  post.mockResolvedValue({ ticket: 'tkt', expiresInSeconds: 30 });
  connection = require('../src/ws/connection') as typeof import('../src/ws/connection');
});

afterEach(() => {
  connection.disconnect();
  jest.useRealTimers();
});

describe('the connection manager', () => {
  it('opens one socket carrying the minted ticket on the first subscription', async () => {
    connection.subscribe(CHAT, jest.fn());
    await flush();

    expect(FakeSocket.opened).toHaveLength(1);
    expect(FakeSocket.at(0).url).toBe('ws://localhost:8080/ws?ticket=tkt');
  });

  it('does not open a second socket for a second topic', async () => {
    connection.subscribe(CHAT, jest.fn());
    await flush();
    FakeSocket.at(0).open();

    connection.subscribe('debug:echo', jest.fn());
    await flush();

    expect(FakeSocket.opened).toHaveLength(1);
  });

  it('sends a subscribe frame for every wanted topic once the socket opens', async () => {
    connection.subscribe(CHAT, jest.fn());
    connection.subscribe('debug:echo', jest.fn());
    await flush();

    FakeSocket.at(0).open();

    expect(FakeSocket.at(0).topics().sort()).toEqual([CHAT, 'debug:echo'].sort());
  });

  it('routes an arriving event to the listener on its topic', async () => {
    const onEvent = jest.fn();
    connection.subscribe(CHAT, onEvent);
    await flush();
    FakeSocket.at(0).open();

    FakeSocket.at(0).deliver({
      topic: CHAT,
      type: 'chat.message.appended',
      eventId: 'e1',
      at: 'now',
      payload: { id: 'm1' },
    });

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'event', type: 'chat.message.appended' }),
    );
  });

  it('silently ignores an event type the client does not know', async () => {
    const onEvent = jest.fn();
    connection.subscribe(CHAT, onEvent);
    await flush();
    FakeSocket.at(0).open();

    expect(() => FakeSocket.at(0).deliver({ action: 'invented-later' })).not.toThrow();
    expect(onEvent).not.toHaveBeenCalled();
  });

  it('does not announce a reconnect on the first successful connect', async () => {
    const onReconnect = jest.fn();
    connection.subscribe(CHAT, jest.fn(), onReconnect);
    await flush();

    FakeSocket.at(0).open();

    expect(onReconnect).not.toHaveBeenCalled();
  });

  it('announces a reconnect and resubscribes after the socket drops and returns', async () => {
    const onReconnect = jest.fn();
    connection.subscribe(CHAT, jest.fn(), onReconnect);
    await flush();
    FakeSocket.at(0).open();

    FakeSocket.at(0).close();
    jest.advanceTimersByTime(60_000);
    await flush();
    FakeSocket.at(1).open();

    expect(FakeSocket.opened).toHaveLength(2);
    expect(FakeSocket.at(1).topics()).toEqual([CHAT]);
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });

  it('unsubscribing the last listener releases the topic on the wire', async () => {
    const onEvent = jest.fn();
    const release = connection.subscribe(CHAT, onEvent);
    await flush();
    FakeSocket.at(0).open();

    release();

    expect(FakeSocket.at(0).actions()).toEqual(['subscribe', 'unsubscribe']);
  });

  it('does not reconnect once every subscription is gone', async () => {
    const release = connection.subscribe(CHAT, jest.fn());
    await flush();
    FakeSocket.at(0).open();
    release();

    FakeSocket.at(0).close();
    jest.advanceTimersByTime(120_000);
    await flush();

    expect(FakeSocket.opened).toHaveLength(1);
  });

  it('retries when the ticket request fails rather than giving up', async () => {
    post.mockRejectedValueOnce(new Error('offline'));
    connection.subscribe(CHAT, jest.fn());
    await flush();

    expect(FakeSocket.opened).toHaveLength(0);

    jest.advanceTimersByTime(60_000);
    await flush();

    expect(FakeSocket.opened).toHaveLength(1);
  });

  it('disconnect tears the socket down and stops the retry loop', async () => {
    connection.subscribe(CHAT, jest.fn());
    await flush();
    FakeSocket.at(0).open();

    connection.disconnect();
    jest.advanceTimersByTime(120_000);
    await flush();

    expect(FakeSocket.at(0).closed).toBe(true);
    expect(FakeSocket.opened).toHaveLength(1);
  });
});
