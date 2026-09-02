import { mapsUrl } from '../places/mapsQuery';
import { isValidPin, type Pin } from './pinRules';


export type PlaceTapTarget =
  | { readonly kind: 'viewer'; readonly place: string; readonly pin: Pin }
  | { readonly kind: 'maps'; readonly url: string };


export function placeTapTarget(
  place: string,
  pin: Pin | null | undefined,
  destination: string | null,
): PlaceTapTarget | null {
  const named = place.trim();
  if (named.length === 0) return null;

  if (isValidPin(pin)) {
    return { kind: 'viewer', place: named, pin };
  }

  const url = mapsUrl(named, destination);
  return url === undefined ? null : { kind: 'maps', url };
}
