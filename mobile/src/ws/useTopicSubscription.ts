import { useEffect, useRef } from 'react';

import { subscribe } from './connection';
import type { EventListener, ReconnectListener } from './subscriptionLedger';

export function useTopicSubscription(
  topic: string | null,
  onEvent: EventListener,
  onReconnect?: ReconnectListener,
): void {
  const event = useRef(onEvent);
  const reconnect = useRef(onReconnect);
  event.current = onEvent;
  reconnect.current = onReconnect;

  useEffect(() => {
    if (topic === null) return;

    return subscribe(
      topic,
      (frame) => event.current(frame),
      () => reconnect.current?.(),
    );
  }, [topic]);
}
