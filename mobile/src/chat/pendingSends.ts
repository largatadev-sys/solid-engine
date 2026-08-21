import type { ThreadMessage } from './chatThread';


export type PendingSend = {
  readonly localId: string;
  readonly body: string;
  readonly at: string;
  readonly state: 'pending' | 'failed';
};


export type PendingSends = readonly PendingSend[];


export function beginSend(
  pending: PendingSends,
  localId: string,
  body: string,
  at: string,
): PendingSends {
  return [...pending, { localId, body, at, state: 'pending' }];
}


export function markFailed(pending: PendingSends, localId: string): PendingSends {
  return pending.map((send) =>
    send.localId === localId ? { ...send, state: 'failed' as const } : send,
  );
}


export function markRetrying(pending: PendingSends, localId: string): PendingSends {
  return pending.map((send) =>
    send.localId === localId ? { ...send, state: 'pending' as const } : send,
  );
}


export function settle(pending: PendingSends, localId: string): PendingSends {
  return pending.filter((send) => send.localId !== localId);
}


export function bodyOf(pending: PendingSends, localId: string): string | null {
  return pending.find((send) => send.localId === localId)?.body ?? null;
}


export function withoutAlreadyConfirmed(
  pending: PendingSends,
  confirmed: readonly ThreadMessage[],
): PendingSends {
  const mineAlready = new Set(
    confirmed.filter((message) => message.mine).map((message) => message.body),
  );
  return pending.filter((send) => send.state === 'failed' || !mineAlready.has(send.body));
}


export function asThreadMessages(
  pending: PendingSends,
  viewerId: string | null,
): ThreadMessage[] {
  return pending.map((send) => ({
    id: send.localId,
    authorId: viewerId ?? '',
    handle: null,
    displayName: null,
    body: send.body,
    at: send.at,
    mine: true,
    state: send.state,
  }));
}
