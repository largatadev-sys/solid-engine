import { mapsLinkLabel, mapsUrl } from '../places/mapsQuery';
import { pinnedLinkLabel } from './mapCopy';
import { isValidPin, type Pin } from './pinRules';


export type PlaceTapTarget =
  | { readonly kind: 'viewer'; readonly place: string; readonly pin: Pin; readonly label: string }
  | { readonly kind: 'maps'; readonly url: string; readonly label: string };


export function placeTapTarget(
  place: string,
  pin: Pin | null | undefined,
  destination: string | null,
): PlaceTapTarget | null {
  const named = place.trim();
  if (named.length === 0) return null;

  if (isValidPin(pin)) {
    return { kind: 'viewer', place: named, pin, label: pinnedLinkLabel(named) };
  }

  const url = mapsUrl(named, destination);
  return url === undefined ? null : { kind: 'maps', url, label: mapsLinkLabel(named) };
}
