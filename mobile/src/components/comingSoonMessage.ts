/**
 * The wording of the "not yet" message (S1.3, ticket 05), shared by both platform forks of {@code
 * comingSoon} so the phrasing cannot drift between the app and the web preview.
 *
 * Split out from the forks because it is the one part that is genuinely platform-independent — and
 * because it is the part worth unit-testing (the forks themselves are a one-line call into a platform
 * API each).
 */
export function comingSoonMessage(what: string): { title: string; body: string } {
  return {
    title: `${what} — coming soon`,
    body: 'This part of the app is still being built. It will arrive in a later update.',
  };
}
