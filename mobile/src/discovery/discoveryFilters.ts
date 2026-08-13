export const DURATION_BANDS = ['1-3', '4-7', '8-14', '15+'] as const;

export type DurationBand = (typeof DURATION_BANDS)[number];

export const MIN_QUERY_LENGTH = 2;

export const MAX_QUERY_LENGTH = 80;


export type DiscoveryFilters = {
  readonly query: string | null;
  readonly destination: string | null;
  readonly duration: DurationBand | null;
};


export const NO_FILTERS: DiscoveryFilters = {
  query: null,
  destination: null,
  duration: null,
};


export function durationLabel(band: DurationBand): string {
  return band === '15+' ? '15+ days' : `${band} days`;
}


export function isDurationBand(raw: string | null | undefined): raw is DurationBand {
  return raw !== null && raw !== undefined && DURATION_BANDS.some((band) => band === raw);
}


export function filtersFromParams(params: {
  q?: string | string[];
  destination?: string | string[];
  duration?: string | string[];
}): DiscoveryFilters {
  const duration = firstOf(params.duration);
  return {
    query: blankToNull(firstOf(params.q)),
    destination: blankToNull(firstOf(params.destination)),
    duration: isDurationBand(duration) ? duration : null,
  };
}


export function paramsFromFilters(filters: DiscoveryFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.query !== null) params.q = filters.query;
  if (filters.destination !== null) params.destination = filters.destination;
  if (filters.duration !== null) params.duration = filters.duration;
  return params;
}


export function queryStringOf(filters: DiscoveryFilters, ...extra: string[]): string {
  const params = new URLSearchParams(paramsFromFilters(filters));
  for (const pair of extra) {
    const [name, value] = pair.split('=');
    if (name !== undefined && value !== undefined) {
      params.set(name, decodeURIComponent(value));
    }
  }
  const rendered = params.toString();
  return rendered === '' ? '' : `?${rendered}`;
}


export function searchesFor(query: string | null): boolean {
  return query !== null && query.trim().length >= MIN_QUERY_LENGTH;
}


export function activeFilterGroups(filters: DiscoveryFilters): number {
  return (filters.destination === null ? 0 : 1) + (filters.duration === null ? 0 : 1);
}


export function differsFromDefaults(filters: DiscoveryFilters): boolean {
  return activeFilterGroups(filters) > 0;
}


export function sameFilters(one: DiscoveryFilters, other: DiscoveryFilters): boolean {
  return (
    one.query === other.query &&
    one.destination === other.destination &&
    one.duration === other.duration
  );
}


export function withDestination(
  filters: DiscoveryFilters,
  destination: string | null,
): DiscoveryFilters {
  return { ...filters, destination: blankToNull(destination) };
}


export function withDuration(
  filters: DiscoveryFilters,
  duration: DurationBand | null,
): DiscoveryFilters {
  return { ...filters, duration };
}


export function clearedOfFilters(filters: DiscoveryFilters): DiscoveryFilters {
  return { query: filters.query, destination: null, duration: null };
}


function firstOf(raw: string | string[] | undefined): string | null {
  if (raw === undefined) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}


function blankToNull(raw: string | null): string | null {
  if (raw === null) return null;
  const trimmed = raw.trim();
  return trimmed === '' ? null : trimmed;
}
