import * as Clipboard from 'expo-clipboard';
import { shareMessage, type SharePayload, type ShareOutcome } from './shareLinkContract';


export function publishedItineraryLink(itineraryId: string): string {
  const origin = typeof window === 'undefined' ? undefined : window.location?.origin;
  return `${origin ?? ''}/published/${itineraryId}`;
}


export async function copyLink(url: string): Promise<'copied' | 'unavailable'> {
  try {
    await Clipboard.setStringAsync(url);
    return 'copied';
  } catch {
    return 'unavailable';
  }
}


export async function shareLink(payload: SharePayload): Promise<ShareOutcome> {
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  if (!canShare) {
    return copyLink(payload.url);
  }
  try {
    await navigator.share({ title: payload.title, text: shareMessage(payload), url: payload.url });
    return 'shared';
  } catch {
    return copyLink(payload.url);
  }
}
