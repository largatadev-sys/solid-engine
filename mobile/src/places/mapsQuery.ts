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


export function mapsPlaceUrl(
  place: string,
  lat: number,
  lng: number,
  zoom: number,
): string | undefined {
  const named = place.trim();
  if (named.length === 0) return undefined;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;

  const close = Number.isFinite(zoom) ? Math.max(1, Math.min(21, Math.round(zoom))) : 16;

  return `https://www.google.com/maps/search/${encodeURIComponent(named)}/@${lat},${lng},${close}z`;
}
