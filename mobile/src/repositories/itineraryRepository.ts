import { apiClient } from '../api/apiClient';
import type { CreateItineraryRequest, ItineraryResponse, Page } from '../types/api';

/**
 * The plan (S0.3) — the app's first domain repository (ADR-001 layering).
 *
 * This layer is deliberately dumb: it maps a call to a path and a typed shape, and knows nothing
 * about caching, React, or when to refetch. That is the query layer's job (`src/query/`), and
 * keeping the two apart is what makes the E3 persistence work a change in one place rather than a
 * sweep — a repository that knew about the cache would have to be rewritten to know about a
 * different one.
 */
export const itineraryRepository = {
  /**
   * The caller's own itineraries, newest first.
   *
   * `cursor` is opaque — whatever `nextCursor` the last page returned, passed back verbatim. This
   * layer never constructs, parses, or reasons about one (Artifact 05).
   */
  async fetchMine(cursor?: string): Promise<Page<ItineraryResponse>> {
    const query = cursor !== undefined ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return apiClient.get<Page<ItineraryResponse>>(`/v1/itineraries${query}`);
  },

  async fetchOne(id: string): Promise<ItineraryResponse> {
    return apiClient.get<ItineraryResponse>(`/v1/itineraries/${id}`);
  },

  async create(request: CreateItineraryRequest): Promise<ItineraryResponse> {
    return apiClient.post<ItineraryResponse>('/v1/itineraries', request);
  },
};
