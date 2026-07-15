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

/** Mirrors `com.largata.common.error.ErrorResponse` — the one error envelope (Artifact 05). */
export type ErrorEnvelope = {
  code: string;
  message: string;
  traceId: string;
  timestamp: string;
};
