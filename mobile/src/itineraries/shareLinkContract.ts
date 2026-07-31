export type ShareOutcome = 'shared' | 'copied' | 'unavailable';


export type SharePayload = { title: string; url: string };


export function shareMessage(payload: SharePayload): string {
  return `${payload.title} — ${payload.url}`;
}


export function copyLinkFeedback(outcome: 'copied' | 'unavailable'): string {
  return outcome === 'copied' ? 'Link copied' : 'Could not copy the link';
}


export function shareFeedback(outcome: ShareOutcome): string | undefined {
  if (outcome === 'shared') return undefined;
  return outcome === 'copied' ? 'Sharing is not available here — the link is copied instead' : undefined;
}
