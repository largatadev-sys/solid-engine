import { MAX_ZOOM, MIN_ZOOM } from './tileProjection';


export interface Pin {
  readonly lat: number;
  readonly lng: number;
  readonly zoom: number;
}


export function isValidPin(pin: Pin | null | undefined): pin is Pin {
  if (pin === null || pin === undefined) return false;

  const { lat, lng, zoom } = pin;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;

  return Number.isInteger(zoom) && zoom >= MIN_ZOOM && zoom <= MAX_ZOOM;
}


export function samePlaceText(one: string, other: string): boolean {
  return one.trim().toLowerCase() === other.trim().toLowerCase();
}


export function pinConfirmable(pin: Pin | null, place: string): boolean {
  return isValidPin(pin) && place.trim().length > 0;
}


export function pinAfterEdit(pin: Pin | null, placeAtDrop: string, placeNow: string): Pin | null {
  if (pin === null) return null;

  return samePlaceText(placeAtDrop, placeNow) ? pin : null;
}
