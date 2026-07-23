/**
 * The wording of a destructive confirm (S1.3), shared by both platform forks of {@code
 * confirmDestructive} so the phrasing cannot drift between the app and the web preview — the
 * {@code comingSoonMessage} pattern, for the same reason.
 */
export function confirmDestructiveMessage(what: string): { title: string; body: string } {
  return {
    title: `Delete ${what}?`,
    body: 'This cannot be undone.',
  };
}
