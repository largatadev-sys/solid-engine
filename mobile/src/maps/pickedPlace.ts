import type { PlaceCandidateResponse } from '../types/api';
import { NOWHERE_NAMED, placeDetailLine } from './mapCopy';


export interface PickedDetail {
  readonly name: string;
  readonly kind: string | null;
  readonly context: string | null;
  readonly exact: boolean;
}


const UNHELPFUL_KINDS = ['postcode', 'houses', 'house'];


export function detailFrom(candidate: PlaceCandidateResponse | null, exact: boolean): PickedDetail | null {
  if (candidate === null) return null;

  const name = candidate.name.trim();
  if (name === '') return null;
  if (!exact && UNHELPFUL_KINDS.includes(candidate.kind?.trim() ?? '')) return null;

  return { name, kind: candidate.kind, context: candidate.context, exact };
}


export function headlineFor(detail: PickedDetail | null, typed: string): string {
  if (detail !== null) return placeDetailLine(detail.name, detail.kind);

  const named = typed.trim();
  return named === '' ? NOWHERE_NAMED : named;
}


export function nameToSave(detail: PickedDetail | null, typed: string): string {
  const named = typed.trim();
  if (named !== '') return named;

  return detail === null ? '' : detail.name;
}


export function needsTyping(detail: PickedDetail | null, typed: string): boolean {
  return detail === null && typed.trim() === '';
}


export function movedAwayFrom(
  anchor: { lat: number; lng: number } | null,
  centre: { lat: number; lng: number },
  tolerance = 0.0002,
): boolean {
  if (anchor === null) return true;

  return (
    Math.abs(anchor.lat - centre.lat) > tolerance || Math.abs(anchor.lng - centre.lng) > tolerance
  );
}
