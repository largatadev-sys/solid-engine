export type ItineraryAddress =
  | { readonly kind: 'itinerary'; readonly itineraryId: string }
  | { readonly kind: 'trip'; readonly tripId: string; readonly itineraryId: string }
  | { readonly kind: 'missing' };


export function addressOf(
  askedFor: string,
  page: { readonly id: string; readonly tripId: string } | undefined,
): ItineraryAddress {
  if (page === undefined) {
    return { kind: 'missing' };
  }
  if (page.id === askedFor) {
    return { kind: 'itinerary', itineraryId: page.id };
  }
  return { kind: 'trip', tripId: askedFor, itineraryId: page.id };
}


export function needsRewrite(address: ItineraryAddress): boolean {
  return address.kind === 'trip';
}
