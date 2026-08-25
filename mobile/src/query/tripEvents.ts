import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type {
  InboxInvitationResponse,
  ItineraryResponse,
  LeaseHolderResponse,
  Page,
} from '../types/api';
import { invitationKeys } from './invitationQueries';
import { itineraryKeys } from './itineraryQueries';
import { joinKeys } from './joinKeys';

export const EDITING_SESSION_ACQUIRED = 'editing-session.acquired';

export const EDITING_SESSION_RELEASED = 'editing-session.released';

export const PLAN_SAVED = 'plan.saved';

export const MEMBERSHIP_GRANTED = 'membership.granted';

export const INVITATION_RECEIVED = 'invitation.received';

export const JOIN_REQUESTS_CHANGED = 'join-requests.changed';

export const ROSTER_CHANGED = 'roster.changed';

export type TripPages = InfiniteData<Page<ItineraryResponse>>;

export interface EditingSessionFrame {
  readonly itineraryId: string;
  readonly editingSession: LeaseHolderResponse | null;
}

export interface PlanSavedFrame {
  readonly itineraryId: string;
  readonly planVersion: number;
  readonly dayCount: number;
  readonly lastEditedAt: string;
}

export type TripEventHandler = (client: QueryClient, payload: unknown, topic: string) => void;


export function travelerTopicFor(travelerId: string): string {
  return `traveler:${travelerId}`;
}


export function itineraryOfTopic(topic: string): string | null {
  const parts = topic.split(':');
  return parts.length === 3 && parts[0] === 'itinerary' && parts[1] !== '' ? parts[1]! : null;
}


export function absorbEditingSession(
  cached: TripPages | undefined,
  frame: EditingSessionFrame,
): TripPages | undefined {
  return patchTrip(cached, frame.itineraryId, (trip) => ({
    ...trip,
    beingEdited: frame.editingSession !== null,
    editingSession: frame.editingSession,
  }));
}


export function absorbPlanSaved(
  cached: TripPages | undefined,
  frame: PlanSavedFrame,
): TripPages | undefined {
  return patchTrip(cached, frame.itineraryId, (trip) => ({
    ...trip,
    planVersion: frame.planVersion,
    dayCount: frame.dayCount,
    lastEditedAt: frame.lastEditedAt,
  }));
}


export function absorbInvitation(
  cached: Page<InboxInvitationResponse> | undefined,
  invitation: InboxInvitationResponse,
): Page<InboxInvitationResponse> | undefined {
  if (cached === undefined) return cached;
  if (cached.items.some((held) => held.id === invitation.id)) return cached;

  return { ...cached, items: [invitation, ...cached.items] };
}


function patchTrip(
  cached: TripPages | undefined,
  itineraryId: string,
  patch: (trip: ItineraryResponse) => ItineraryResponse,
): TripPages | undefined {
  if (cached === undefined) return cached;
  if (!cached.pages.some((page) => page.items.some((trip) => trip.id === itineraryId))) {
    return cached;
  }

  return {
    ...cached,
    pages: cached.pages.map((page) => ({
      ...page,
      items: page.items.map((trip) => (trip.id === itineraryId ? patch(trip) : trip)),
    })),
  };
}


const HANDLERS: Readonly<Record<string, TripEventHandler>> = {
  [EDITING_SESSION_ACQUIRED]: absorbEditingSessionEverywhere,
  [EDITING_SESSION_RELEASED]: absorbEditingSessionEverywhere,
  [PLAN_SAVED]: absorbPlanSavedEverywhere,
  [MEMBERSHIP_GRANTED]: refetchTripsAndInbox,
  [INVITATION_RECEIVED]: absorbInvitationIntoInbox,
  [JOIN_REQUESTS_CHANGED]: refetchJoinRequests,
  [ROSTER_CHANGED]: refetchRoster,
};


export function tripEventHandlerFor(type: string): TripEventHandler | undefined {
  return Object.prototype.hasOwnProperty.call(HANDLERS, type) ? HANDLERS[type] : undefined;
}


function absorbPlanSavedEverywhere(client: QueryClient, payload: unknown): void {
  const frame = payload as PlanSavedFrame | null;
  if (frame === null || typeof frame !== 'object' || typeof frame.itineraryId !== 'string') return;

  eachTripList(client, (queryKey) => {
    client.setQueryData<TripPages>(queryKey, (cached) => absorbPlanSaved(cached, frame));
  });

  void client.invalidateQueries({ queryKey: itineraryKeys.one(frame.itineraryId) });
}


function absorbInvitationIntoInbox(client: QueryClient, payload: unknown): void {
  const invitation = payload as InboxInvitationResponse | null;
  if (invitation === null || typeof invitation !== 'object' || typeof invitation.id !== 'string') return;

  client.setQueryData<Page<InboxInvitationResponse>>(invitationKeys.inbox(), (cached) =>
    absorbInvitation(cached, invitation),
  );
}


function refetchTripsAndInbox(client: QueryClient): void {
  void client.invalidateQueries({ queryKey: itineraryKeys.lists() });
  void client.invalidateQueries({ queryKey: invitationKeys.inbox() });
  void client.invalidateQueries({ queryKey: joinKeys.mine() });
}


export function markStaleOnReconnect(client: QueryClient): void {
  const stale = { refetchType: 'none' } as const;

  void client.invalidateQueries({ queryKey: itineraryKeys.lists(), ...stale });
  void client.invalidateQueries({ queryKey: invitationKeys.all, ...stale });
  void client.invalidateQueries({ queryKey: joinKeys.all, ...stale });
}


function refetchJoinRequests(client: QueryClient, _payload: unknown, topic: string): void {
  const itineraryId = itineraryOfTopic(topic);
  if (itineraryId === null) return;

  void client.invalidateQueries({ queryKey: joinKeys.requests(itineraryId) });
}


function refetchRoster(client: QueryClient, _payload: unknown, topic: string): void {
  const itineraryId = itineraryOfTopic(topic);
  if (itineraryId === null) return;

  void client.invalidateQueries({ queryKey: invitationKeys.members(itineraryId) });
  void client.invalidateQueries({ queryKey: invitationKeys.pending(itineraryId) });
}


function eachTripList(client: QueryClient, visit: (queryKey: readonly unknown[]) => void): void {
  client
    .getQueryCache()
    .findAll({ queryKey: itineraryKeys.lists() })
    .forEach((query) => visit(query.queryKey));
}


function absorbEditingSessionEverywhere(client: QueryClient, payload: unknown): void {
  const frame = payload as EditingSessionFrame | null;
  if (frame === null || typeof frame !== 'object' || typeof frame.itineraryId !== 'string') return;

  eachTripList(client, (queryKey) => {
    client.setQueryData<TripPages>(queryKey, (cached) => absorbEditingSession(cached, frame));
  });

  client.setQueryData<ItineraryResponse>(itineraryKeys.one(frame.itineraryId), (trip) =>
    trip === undefined
      ? trip
      : { ...trip, beingEdited: frame.editingSession !== null, editingSession: frame.editingSession },
  );
}
