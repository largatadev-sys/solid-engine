export type SocketFrame =
  | {
      kind: 'event';
      topic: string;
      type: string;
      eventId: string;
      at: string;
      payload: unknown;
    }
  | { kind: 'subscribed'; topic: string }
  | { kind: 'unsubscribed'; topic: string }
  | { kind: 'error'; code: string; topic?: string };

export function parseFrame(raw: string): SocketFrame | null {
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;

  const frame = value as Record<string, unknown>;

  if (typeof frame.type === 'string' && typeof frame.topic === 'string') {
    return {
      kind: 'event',
      topic: frame.topic,
      type: frame.type,
      eventId: typeof frame.eventId === 'string' ? frame.eventId : '',
      at: typeof frame.at === 'string' ? frame.at : '',
      payload: frame.payload,
    };
  }

  switch (frame.action) {
    case 'subscribed':
      return typeof frame.topic === 'string' ? { kind: 'subscribed', topic: frame.topic } : null;
    case 'unsubscribed':
      return typeof frame.topic === 'string' ? { kind: 'unsubscribed', topic: frame.topic } : null;
    case 'error':
      return typeof frame.code === 'string'
        ? {
            kind: 'error',
            code: frame.code,
            ...(typeof frame.topic === 'string' ? { topic: frame.topic } : {}),
          }
        : null;
    default:
      return null;
  }
}
