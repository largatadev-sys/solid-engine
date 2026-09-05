import { apiClient } from '../api/apiClient';
import type { MapConfig } from '../maps/tileUrl';
import type { PlaceCandidateResponse, PlaceSearchResponse } from '../types/api';


export const placeRepository = {

  async fetchMapConfig(): Promise<MapConfig> {
    return apiClient.get<MapConfig>('/v1/places/map-config');
  },


  async nameFor(lat: number, lng: number): Promise<PlaceCandidateResponse | null> {
    return apiClient.get<PlaceCandidateResponse | null>(`/v1/places/reverse?lat=${lat}&lng=${lng}`);
  },


  async search(query: string, bias: { lat: number; lng: number } | null): Promise<PlaceSearchResponse> {
    const near = bias === null ? '' : `&lat=${bias.lat}&lng=${bias.lng}`;
    return apiClient.get<PlaceSearchResponse>(
      `/v1/places/search?q=${encodeURIComponent(query)}${near}`,
    );
  },
};
