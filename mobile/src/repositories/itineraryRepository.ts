import { apiClient } from '../api/apiClient';
import type {
  ActivityRequest,
  ActivityResponse,
  CreateItineraryRequest,
  DayRequest,
  DayResponse,
  EditLeaseResponse,
  ItineraryResponse,
  MoveActivityRequest,
  Page,
  ReorderActivitiesRequest,
  UpdateItineraryRequest,
} from '../types/api';

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

  /**
   * Edits the itinerary's own fields (S1.3, ticket 04). Whole-field PATCH; returns the updated
   * itinerary with its plan re-embedded, so the caller has the fresh resource.
   */
  async update(id: string, request: UpdateItineraryRequest): Promise<ItineraryResponse> {
    return apiClient.patch<ItineraryResponse>(`/v1/itineraries/${id}`, request);
  },

  /**
   * The day operations (S1.3, ADR-013). Itinerary-addressed — the app never handles a workspace id
   * (the S1.2 convention) — and each returns the affected day, except delete which returns nothing.
   * The ordinal is the server's to assign on append; this layer never sends one.
   */
  async appendDay(itineraryId: string, request: DayRequest): Promise<DayResponse> {
    return apiClient.post<DayResponse>(`/v1/itineraries/${itineraryId}/days`, request);
  },

  async renameDay(itineraryId: string, dayId: string, request: DayRequest): Promise<DayResponse> {
    return apiClient.patch<DayResponse>(`/v1/itineraries/${itineraryId}/days/${dayId}`, request);
  },

  async deleteDay(itineraryId: string, dayId: string): Promise<void> {
    return apiClient.delete(`/v1/itineraries/${itineraryId}/days/${dayId}`);
  },

  /**
   * The activity operations (S1.3, ticket 02). Addressed by itinerary + day (the S1.3 convention);
   * create/edit return the affected activity, delete returns nothing. Edit is a whole-entity replace
   * (last-write-wins), so it sends the same body shape as create.
   */
  async createActivity(itineraryId: string, dayId: string, request: ActivityRequest): Promise<ActivityResponse> {
    return apiClient.post<ActivityResponse>(`/v1/itineraries/${itineraryId}/days/${dayId}/activities`, request);
  },

  async editActivity(
    itineraryId: string,
    dayId: string,
    activityId: string,
    request: ActivityRequest,
  ): Promise<ActivityResponse> {
    return apiClient.patch<ActivityResponse>(
      `/v1/itineraries/${itineraryId}/days/${dayId}/activities/${activityId}`,
      request,
    );
  },

  async deleteActivity(itineraryId: string, dayId: string, activityId: string): Promise<void> {
    return apiClient.delete(`/v1/itineraries/${itineraryId}/days/${dayId}/activities/${activityId}`);
  },

  /**
   * Reorders a day's activities to the given order (S1.3, ticket 03). A whole-list PUT — the server
   * rewrites sort order to match and returns the reordered day (the caller refetches the plan anyway,
   * so the returned day is a convenience, not load-bearing).
   */
  async reorderActivities(
    itineraryId: string,
    dayId: string,
    request: ReorderActivitiesRequest,
  ): Promise<DayResponse> {
    return apiClient.put<DayResponse>(`/v1/itineraries/${itineraryId}/days/${dayId}/activities/order`, request);
  },

  /** Moves an activity to another day, landing at that day's end (S1.3, ticket 03). */
  async moveActivity(
    itineraryId: string,
    dayId: string,
    activityId: string,
    request: MoveActivityRequest,
  ): Promise<ActivityResponse> {
    return apiClient.post<ActivityResponse>(
      `/v1/itineraries/${itineraryId}/days/${dayId}/activities/${activityId}/move`,
      request,
    );
  },

  /**
   * The single-writer edit lock (S1.4, ADR-014). `acquire` claims (or renews) the lease before an
   * edit surface opens; `renew` is the heartbeat while it stays open; `release` frees it on exit.
   *
   * A denied acquire/renew throws an {@link import('../api/ApiError').ApiError} with code
   * `EDIT_LOCKED` (a 409 whose message names the holder — shown as-is in the lock modal). `release` is
   * idempotent server-side, so a best-effort release on navigate-away never fails; the caller may
   * ignore its result. Offline, `acquire` throws `NETWORK_UNAVAILABLE` — editing needs connectivity
   * (the lease is minutes-scale and cannot survive an offline gap), and the edit surface surfaces that
   * as a graceful "you're offline" message rather than opening a form no write could reach.
   */
  async acquireEditLock(itineraryId: string): Promise<EditLeaseResponse> {
    return apiClient.post<EditLeaseResponse>(`/v1/itineraries/${itineraryId}/edit-lock`, undefined);
  },

  async renewEditLock(itineraryId: string): Promise<EditLeaseResponse> {
    return apiClient.post<EditLeaseResponse>(`/v1/itineraries/${itineraryId}/edit-lock/renew`, undefined);
  },

  async releaseEditLock(itineraryId: string): Promise<void> {
    return apiClient.delete(`/v1/itineraries/${itineraryId}/edit-lock`);
  },
};
