import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useTopicSubscription } from '../ws/useTopicSubscription';
import { travelerTopicFor, tripEventHandlerFor } from './tripEvents';
import type { EventListener } from '../ws/subscriptionLedger';

export function useTripDelivery(travelerId: string | null): void {
  const client = useQueryClient();

  const onEvent = useCallback<EventListener>(
    (frame) => {
      tripEventHandlerFor(frame.type)?.(client, frame.payload);
    },
    [client],
  );

  useTopicSubscription(travelerId === null ? null : travelerTopicFor(travelerId), onEvent);
}
