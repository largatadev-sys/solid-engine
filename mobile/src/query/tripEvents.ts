import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type { ItineraryResponse, LeaseHolderResponse, Page } from '../types/api';
import { itineraryKeys } from './itineraryQueries';

export const EDITING_SESSION_ACQUIRED = 'editing-session.acquired';

export const EDITING_SESSION_RELEASED = 'editing-session.released';

export type TripPages = InfiniteData<Page<ItineraryResponse>>;

export interface EditingSessionFrame {
  readonly itineraryId: string;
  readonly editingSession: LeaseHolderResponse | null;
}

export type TripEventHandler = (client: QueryClient, payload: unknown) => void;


export function travelerTopicFor(travelerId: string): string {
  return `traveler:${travelerId}`;
}


export function absorbEditingSession(
  cached: TripPages | undefined,
  frame: EditingSessionFrame,
): TripPages | undefined {
  if (cached === undefined) return cached;
  if (!cached.pages.some((page) => page.items.some((trip) => trip.id === frame.itineraryId))) {
    return cached;
  }

  return {
    ...cached,
    pages: cached.pages.map((page) => ({
      ...page,
      items: page.items.map((trip) =>
        trip.id === frame.itineraryId
          ? { ...trip, beingEdited: frame.editingSession !== null, editingSession: frame.editingSession }
          : trip,
      ),
    })),
  };
}


const HANDLERS: Readonly<Record<string, TripEventHandler>> = {
  [EDITING_SESSION_ACQUIRED]: absorbEditingSessionEverywhere,
  [EDITING_SESSION_RELEASED]: absorbEditingSessionEverywhere,
};


export function tripEventHandlerFor(type: string): TripEventHandler | undefined {
  return Object.prototype.hasOwnProperty.call(HANDLERS, type) ? HANDLERS[type] : undefined;
}


function absorbEditingSessionEverywhere(client: QueryClient, payload: unknown): void {
  const frame = payload as EditingSessionFrame | null;
  if (frame === null || typeof frame !== 'object' || typeof frame.itineraryId !== 'string') return;

  client
    .getQueryCache()
    .findAll({ queryKey: itineraryKeys.lists() })
    .forEach((query) => {
      client.setQueryData<TripPages>(query.queryKey, (cached) => absorbEditingSession(cached, frame));
    });

  client.setQueryData<ItineraryResponse>(itineraryKeys.one(frame.itineraryId), (trip) =>
    trip === undefined
      ? trip
      : { ...trip, beingEdited: frame.editingSession !== null, editingSession: frame.editingSession },
  );
}
