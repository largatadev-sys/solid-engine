import { showcaseMetaLine } from '../profile/showcaseCard';
import type { DiscoveryCardResponse } from '../types/api';


const ANONYMOUS_AUTHOR = 'A traveler';


export function discoveryMetaLine(card: DiscoveryCardResponse): string | null {
  return showcaseMetaLine(card.destinations, card.durationDays);
}


export function discoveryAuthorLabel(card: DiscoveryCardResponse): string {
  const handle = card.author.handle;
  return handle !== null && handle.trim() !== '' ? `@${handle.trim()}` : ANONYMOUS_AUTHOR;
}


export function publishedItineraryRoute(itineraryId: string): {
  pathname: '/published/[id]';
  params: { id: string };
} {
  return { pathname: '/published/[id]', params: { id: itineraryId } };
}


export function showsSeeAllCard(railSize: number): boolean {
  return railSize > 0;
}


export function discoveryCardAccessibilityLabel(card: DiscoveryCardResponse): string {
  const meta = discoveryMetaLine(card);
  const where = meta === null ? '' : `, ${meta}`;
  return `${card.title}${where}, by ${discoveryAuthorLabel(card)}`;
}
