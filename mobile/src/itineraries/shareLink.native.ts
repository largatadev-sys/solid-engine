import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';
import { shareMessage, type SharePayload, type ShareOutcome } from './shareLinkContract';


export function publishedItineraryLink(itineraryId: string): string {
  return `largata://published/${itineraryId}`;
}


export async function copyLink(url: string): Promise<'copied' | 'unavailable'> {
  await Clipboard.setStringAsync(url);
  return 'copied';
}


export async function shareLink(payload: SharePayload): Promise<ShareOutcome> {
  await Share.share({ title: payload.title, message: shareMessage(payload) });
  return 'shared';
}
