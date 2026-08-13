import { MAX_QUERY_LENGTH, MIN_QUERY_LENGTH } from './discoveryFilters';

export const SEARCH_DEBOUNCE_MS = 300;


export function queriesFor(raw: string): boolean {
  const trimmed = raw.trim();
  return trimmed.length >= MIN_QUERY_LENGTH && trimmed.length <= MAX_QUERY_LENGTH;
}


export function submittableQuery(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) {
    return null;
  }
  return trimmed.slice(0, MAX_QUERY_LENGTH);
}


export function acceptsResponse(sequence: number, latestSequence: number): boolean {
  return sequence >= latestSequence;
}
