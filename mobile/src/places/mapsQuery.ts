const MAPS_SEARCH = 'https://www.google.com/maps/search/?api=1&query=';


export function mapsQuery(place: string, destination: string | null): string | undefined {
  const named = place.trim();
  if (named.length === 0) return undefined;

  const hint = destination?.trim() ?? '';
  if (hint.length === 0) return named;
  if (named.toLowerCase().includes(hint.toLowerCase())) return named;

  return `${named}, ${hint}`;
}


export function mapsUrl(place: string, destination: string | null): string | undefined {
  const query = mapsQuery(place, destination);
  if (query === undefined) return undefined;

  return `${MAPS_SEARCH}${encodeURIComponent(query)}`;
}


export function mapsLinkLabel(place: string): string {
  return `${place.trim()}, open in Google Maps`;
}


export function mapsPinUrl(lat: number, lng: number): string | undefined {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;

  return `${MAPS_SEARCH}${encodeURIComponent(`${lat},${lng}`)}`;
}
