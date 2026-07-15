/**
 * The one place the API client gets a token from.
 *
 * Why this indirection exists rather than `apiClient` importing Firebase directly: it keeps the
 * transport layer ignorant of *who* issues tokens. The client's contract is "attach the current
 * bearer token, if there is one" — Firebase satisfies that today; if ADR-006's designed exit is
 * ever taken (the Traveler-keyed-by-UID indirection), only this file changes.
 *
 * It is also what makes `apiClient` testable without mocking a native module: tests set a stub
 * token source instead of faking Firebase's SDK surface.
 */

export type TokenSource = () => Promise<string | null>;

/** No user signed in — requests go out unauthenticated and the backend answers UNAUTHENTICATED. */
const anonymous: TokenSource = async () => null;

let current: TokenSource = anonymous;

/** Wired once at app start (see `src/auth/firebaseTokenSource.ts`). */
export function setTokenSource(source: TokenSource): void {
  current = source;
}

export async function currentToken(): Promise<string | null> {
  return current();
}

/** Test seam: restores the signed-out default. */
export function resetTokenSource(): void {
  current = anonymous;
}
