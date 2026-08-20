import { apiClient, baseUrl } from '../api/apiClient';
import { parseFrame } from './frameDispatch';
import { delayForAttempt } from './reconnectBackoff';
import { socketUrlFrom } from './socketUrl';
import { SubscriptionLedger, type EventListener, type ReconnectListener } from './subscriptionLedger';

type TicketResponse = { ticket: string; expiresInSeconds: number };

type State = 'idle' | 'connecting' | 'open';

const ledger = new SubscriptionLedger();

let socket: WebSocket | null = null;
let state: State = 'idle';
let attempt = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let hadOpened = false;
let opening = false;

function sendFrame(frame: Record<string, unknown>): void {
  if (socket === null || state !== 'open') return;
  socket.send(JSON.stringify(frame));
}

function requestSubscribe(topic: string): void {
  sendFrame({ action: 'subscribe', topic });
}

function requestUnsubscribe(topic: string): void {
  sendFrame({ action: 'unsubscribe', topic });
}

function clearRetry(): void {
  if (retryTimer !== null) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function scheduleReconnect(): void {
  if (ledger.topics().length === 0) {
    state = 'idle';
    return;
  }
  clearRetry();
  attempt += 1;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void open();
  }, delayForAttempt(attempt));
}

function onOpen(): void {
  state = 'open';
  attempt = 0;
  for (const topic of ledger.topics()) requestSubscribe(topic);
  if (hadOpened) ledger.announceReconnect();
  hadOpened = true;
}

function onMessage(raw: string): void {
  const frame = parseFrame(raw);
  if (frame === null || frame.kind !== 'event') return;
  ledger.deliver(frame.topic, frame);
}

function onClosed(): void {
  socket = null;
  if (state === 'idle') return;
  state = 'connecting';
  scheduleReconnect();
}

async function open(): Promise<void> {
  if (socket !== null || opening || ledger.topics().length === 0) return;
  opening = true;
  state = 'connecting';

  let ticket: TicketResponse;
  try {
    ticket = await apiClient.post<TicketResponse>('/v1/ws-ticket', {});
  } catch {
    opening = false;
    scheduleReconnect();
    return;
  }
  if (ledger.topics().length === 0) {
    opening = false;
    state = 'idle';
    return;
  }

  const fresh = new WebSocket(socketUrlFrom(baseUrl(), ticket.ticket));
  socket = fresh;
  opening = false;
  fresh.onopen = () => {
    if (socket === fresh) onOpen();
  };
  fresh.onmessage = (event: { data: unknown }) => {
    if (socket === fresh && typeof event.data === 'string') onMessage(event.data);
  };
  fresh.onerror = () => {
    if (socket === fresh) fresh.close();
  };
  fresh.onclose = () => {
    if (socket === fresh) onClosed();
  };
}

export function subscribe(
  topic: string,
  onEvent: EventListener,
  onReconnect?: ReconnectListener,
): () => void {
  const isNewTopic = ledger.add(topic, onEvent, onReconnect);
  if (isNewTopic) {
    if (state === 'open') requestSubscribe(topic);
    else void open();
  }

  return () => {
    const dropped = ledger.remove(topic, onEvent);
    if (dropped && state === 'open') requestUnsubscribe(topic);
  };
}

export function reconnectIfDead(): void {
  if (socket === null && ledger.topics().length > 0) {
    clearRetry();
    attempt = 0;
    void open();
  }
}

export function disconnect(): void {
  clearRetry();
  state = 'idle';
  attempt = 0;
  hadOpened = false;
  const closing = socket;
  socket = null;
  closing?.close();
}
