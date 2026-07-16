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
  /** Absent when the traveler gave no start date — undated trips are legitimate (S0.3 spec). */
  startDate?: string;
  endDate?: string;
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
