import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useTopicSubscription } from '../ws/useTopicSubscription';
import { markStaleOnReconnect, travelerTopicFor, tripEventHandlerFor } from './tripEvents';
import type { EventListener } from '../ws/subscriptionLedger';

export function useTripDelivery(travelerId: string | null): void {
  const client = useQueryClient();

  const onEvent = useCallback<EventListener>(
    (frame) => {
      tripEventHandlerFor(frame.type)?.(client, frame.payload, frame.topic);
    },
    [client],
  );

  const onReconnect = useCallback(() => {
    markStaleOnReconnect(client);
  }, [client]);

  useTopicSubscription(
    travelerId === null ? null : travelerTopicFor(travelerId),
    onEvent,
    onReconnect,
  );
}
