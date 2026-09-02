import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { MapConfig } from '../maps/tileUrl';
import { placeRepository } from '../repositories/placeRepository';
import type { PlaceCandidateResponse, PlaceSearchResponse } from '../types/api';


export const placeKeys = {
  all: ['places'] as const,
  mapConfig: () => [...placeKeys.all, 'map-config'] as const,
  search: (query: string, bias: { lat: number; lng: number } | null) =>
    [...placeKeys.all, 'search', query, bias] as const,
};


const A_DAY = 24 * 60 * 60 * 1000;

const MIN_QUERY_LENGTH = 2;


export function useMapConfig(): UseQueryResult<MapConfig> {
  return useQuery({
    queryKey: placeKeys.mapConfig(),
    queryFn: () => placeRepository.fetchMapConfig(),
    staleTime: A_DAY,
  });
}


export function usePlaceSearch(
  query: string,
  bias: { lat: number; lng: number } | null,
): UseQueryResult<PlaceSearchResponse> {
  const asked = query.trim();

  return useQuery({
    queryKey: placeKeys.search(asked, bias),
    queryFn: () => placeRepository.search(asked, bias),
    enabled: asked.length >= MIN_QUERY_LENGTH,
    retry: false,
    staleTime: A_DAY,
  });
}

export async function nameForPin(
  lat: number,
  lng: number,
): Promise<PlaceCandidateResponse | null> {
  try {
    return (await placeRepository.nameFor(lat, lng)) ?? null;
  } catch {
    return null;
  }
}
