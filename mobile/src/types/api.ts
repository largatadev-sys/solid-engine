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
  createdAt: string;
};

/** Mirrors `com.largata.itinerary.api.CreateItineraryRequest`. */
export type CreateItineraryRequest = {
  title: string;
  destinations: string[];
  startDate?: string;
  endDate?: string;
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
