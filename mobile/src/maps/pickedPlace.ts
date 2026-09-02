import type { PlaceCandidateResponse } from '../types/api';



export interface PickedDetail {
  readonly name: string;
  readonly nearby: boolean;
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

  return { name, nearby: candidate.nearby === true, kind: candidate.kind, context: candidate.context, exact };
}


export function headlineFor(detail: PickedDetail | null): string {
  return detail === null || detail.nearby ? '' : detail.name;
}


export function nameToSave(typed: string): string {
  return typed.trim();
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


export function whereLine(detail: PickedDetail | null): string {
  return detail?.context?.trim() ?? '';
}
