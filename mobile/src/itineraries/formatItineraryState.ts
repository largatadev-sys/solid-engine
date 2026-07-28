/**
 * The trip's lifecycle phase as a badge label (S1.7).
 *
 * **Unknown states render as themselves rather than crashing or vanishing.** `ItineraryResponse.state`
 * is typed `string`, not a union, precisely because ADR-008 lets the server start sending new values
 * within /v1 — `published` arrives at S4.1, and this build is already on phones. An exhaustive map
 * that returned `undefined` for an unknown value would blank the badge on a trip whose state is the
 * most interesting thing about it; falling back to the server's own word is honest and legible.
 */
export function formatItineraryState(state: string): string {
  switch (state) {
    case 'draft':
      return 'Draft';
    case 'active':
      return 'Active';
    case 'completed':
      return 'Completed';
    default:
      // Capitalise whatever the server sent: a future `published` reads as "Published" with no
      // release of this app, and a genuinely unrecognisable value still shows something truthful.
      return state.charAt(0).toUpperCase() + state.slice(1);
  }
}
