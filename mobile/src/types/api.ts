/**
 * The one types location (06b §6): these mirror the backend's DTOs.
 *
 * There is no cross-language shared package — Java and TypeScript cannot share source — so this
 * mirror is kept honest by the additive-only /v1 rule (ADR-008). That rule is what makes a
 * hand-mirrored contract safe: fields may appear, never change meaning or vanish.
 */

/** Mirrors `com.largata.health.api.HealthResponse`. */
export type HealthResponse = {
  status: string;
};

/**
 * Mirrors `com.largata.identity.api.MeResponse` — the authenticated traveler (S0.2).
 *
 * Three fields, matching the backend exactly: no `firebaseUid` (the client already knows its own
 * from the Firebase SDK), no `createdAt` (nothing reads it). Fields may appear here later; under
 * ADR-008 none of these can ever change meaning or vanish.
 */
export type MeResponse = {
  id: string;
  displayName: string;
  email: string;
};

/**
 * Mirrors `com.largata.itinerary.api.ItineraryResponse` — the plan (S0.3).
 *
 * `state` and `visibility` are strings, not unions of the values S0.3 can produce. A
 * `'draft' | 'private'` union would be a lie the day S1.7 adds `active`: under ADR-008 the server
 * may start sending new values within /v1 without warning, and this app — already installed on
 * phones — must tolerate them rather than fail to parse. Clients tolerate unknown values; that is
 * the same promise the additive rule asks of them for unknown fields.
 */
export type ItineraryResponse = {
  id: string;
  title: string;
  destinations: string[];
  /** `null` when the traveler gave no description — S1.3 addition (ADR-008 additive). */
  description: string | null;
  /**
   * `null` when the traveler gave no start date — undated trips are legitimate (S0.3 spec).
   *
   * **`null`, not `?`, and the difference is not cosmetic.** The server sends `"startDate": null`
   * (Jackson includes nulls by default), so an optional field types a shape the API never sends and
   * makes `x !== undefined` pass for a value that is null — which rendered a literal "null → null"
   * on the device while every unit test, constructing objects where absent means undefined, stayed
   * green. Found by the S0.3 device AC; the honest type is the fix that could not have been guessed
   * from the tests.
   */
  startDate: string | null;
  endDate: string | null;
  state: string;
  visibility: string;
  /** Who last edited the itinerary's fields, and when — `null` until the first edit (S1.3, ticket 04 writes it). */
  lastEditedBy: string | null;
  lastEditedAt: string | null;
  /**
   * The plan: days in order, each with its activities (S1.3, ADR-013). Empty for a pre-S1.3
   * itinerary or one created without a duration — a valid plan, not an error. Present on the single
   * fetch; the list (`fetchMine`) sends `[]` because cards do not render plans.
   */
  days: DayResponse[];
  createdAt: string;
};

/** Mirrors `com.largata.itinerary.api.DayResponse` — one ordinal slot of the plan (S1.3, ADR-013). */
export type DayResponse = {
  id: string;
  ordinal: number;
  /** `null` for an untitled day ("Day 3" with no name). */
  title: string | null;
  /** In manual sort order (ADR-013); empty until ticket 02 gives activities their CRUD. */
  activities: ActivityResponse[];
};

/**
 * Mirrors `com.largata.itinerary.api.ActivityResponse` — one element of a day's plan (S1.3).
 *
 * Ticket 01 ships the shape; ticket 02 ships the data. `timeOfDay` is an ISO local time
 * (`"14:00"`), no date/zone. Cost is amount + currency, both `null` together — `null` amount is
 * "unstated", `"0"` is "Free" (a real, different fact). `costAmount` is a string, not a number:
 * Jackson serialises `NUMERIC` as a JSON number but money must not round-trip through a float, so the
 * wire carries it verbatim and the UI formats the string.
 */
export type ActivityResponse = {
  id: string;
  sortOrder: number;
  title: string;
  timeOfDay: string | null;
  costAmount: string | null;
  costCurrency: string | null;
  place: string | null;
  description: string | null;
  notes: string | null;
  externalUrl: string | null;
  lastEditedBy: string;
  lastEditedAt: string;
};

/**
 * Mirrors `com.largata.itinerary.api.CreateItineraryRequest`.
 *
 * `description` and `durationDays` are S1.3 additions (ADR-008 additive). `durationDays` mints that
 * many empty days on the server; absent means an undated, zero-day skeleton.
 */
export type CreateItineraryRequest = {
  title: string;
  destinations: string[];
  description?: string;
  startDate?: string;
  endDate?: string;
  durationDays?: number;
};

/**
 * Mirrors `com.largata.itinerary.api.UpdateItineraryRequest` — the edit-itinerary-fields body (S1.3,
 * ticket 04). Whole-field despite the PATCH verb (last-write-wins): the body is the new whole state,
 * so an omitted `description` clears it and the client sends the current title/destinations it keeps.
 */
export type UpdateItineraryRequest = {
  title: string;
  destinations: string[];
  description?: string;
  startDate?: string;
  endDate?: string;
};

/** Mirrors `com.largata.itinerary.api.DayRequest` — the append/rename-a-day body (S1.3). */
export type DayRequest = {
  title?: string;
};

/**
 * Mirrors `com.largata.itinerary.api.ActivityRequest` — the create/edit-activity body (S1.3, ticket
 * 02). One shape for both: last-write-wins means an edit sends the whole activity, exactly as create
 * does. `costAmount` and `timeOfDay` are strings on the wire (`"500.00"`, `"14:00"`) — money must not
 * round-trip through a float, and time is an ISO local time. Omitted optional fields clear on edit.
 */
export type ActivityRequest = {
  title: string;
  timeOfDay?: string;
  costAmount?: string;
  costCurrency?: string;
  place?: string;
  description?: string;
  notes?: string;
  externalUrl?: string;
};

/**
 * Mirrors `com.largata.itinerary.api.ReorderActivitiesRequest` — the complete ordered list of a day's
 * activity ids (S1.3, ticket 03). Whole-list, because manual order is authoritative (ADR-013): the
 * client owns the arrangement and sends it entire. The server rejects a list that is not exactly the
 * day's activities (a stale one) with a 400.
 */
export type ReorderActivitiesRequest = {
  activityIds: string[];
};

/**
 * Mirrors `com.largata.itinerary.api.MoveActivityRequest` — move an activity to another day, landing
 * at that day's end (S1.3, ticket 03). Kept distinct from an edit because move is position, edit is
 * content (last-write-wins).
 */
export type MoveActivityRequest = {
  targetDayId: string;
};

/**
 * Mirrors `com.largata.itinerary.api.EditLeaseResponse` — a granted edit lock (S1.4, ADR-014): who
 * holds the single-writer lease on this itinerary's plan, and when it lapses. Returned by acquire and
 * renew.
 */
export type EditLeaseResponse = {
  itineraryId: string;
  holderId: string;
  /** ISO-8601 instant. The client renews before this; it never relies on its own clock to expire. */
  expiresAt: string;
};

/**
 * Mirrors `com.largata.common.api.Page<T>` — the one pagination shape (Artifact 05), for every list
 * in the API.
 *
 * `nextCursor` is opaque: pass it back verbatim, never parse it. Absent means the list is exhausted.
 */
export type Page<T> = {
  items: T[];
  nextCursor?: string;
};

/** Mirrors `com.largata.common.error.ErrorResponse` — the one error envelope (Artifact 05). */
export type ErrorEnvelope = {
  code: string;
  message: string;
  traceId: string;
  timestamp: string;
};

/**
 * Mirrors `com.largata.invitation.web.CreateInvitationRequest` — the address to invite (S1.2).
 */
export type CreateInvitationRequest = {
  email: string;
};

/**
 * Mirrors `com.largata.invitation.web.InvitationResponse` — a pending invitation, the owner's view
 * (S1.2). Both the create response and the pending-list items; pending by construction.
 */
export type InvitationResponse = {
  id: string;
  email: string;
  createdAt: string;
  expiresAt: string;
};

/**
 * Mirrors `com.largata.invitation.web.InboxInvitationResponse` — the invitee's inbox card (S1.2):
 * which trip, who invited them, and the itinerary to open on accept.
 */
export type InboxInvitationResponse = {
  id: string;
  itineraryId: string;
  tripTitle: string;
  inviterName: string;
  createdAt: string;
  expiresAt: string;
};

/**
 * Mirrors `com.largata.invitation.web.MemberResponse` — a workspace member (S1.2). `role` is a
 * string, not a `'owner' | 'member'` union: under ADR-008 the server may add values within /v1, and
 * this installed app must tolerate them (the same reasoning as `ItineraryResponse.state`).
 */
export type MemberResponse = {
  travelerId: string;
  displayName: string;
  role: string;
  joinedAt: string;
};

/** Mirrors `com.largata.invitation.web.AcceptResponse` — the itinerary just joined (S1.2). */
export type AcceptResponse = {
  itineraryId: string;
};
