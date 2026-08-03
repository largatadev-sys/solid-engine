import { apiClient } from '../api/apiClient';
import type {
  ActivityRequest,
  ActivityResponse,
  CreateItineraryRequest,
  DayRequest,
  DayResponse,
  EditLeaseResponse,
  ItineraryResponse,
  LeaseSubject,
  MoveActivityRequest,
  Page,
  PublishedItineraryResponse,
  PublishAudience,
  ReorderActivitiesRequest,
  TripCategory,
  UpdateItineraryRequest,
} from '../types/api';


export const itineraryRepository = {

  async fetchMine(
    cursor?: string,
    archived = false,
    category?: TripCategory,
  ): Promise<Page<ItineraryResponse>> {
    const params = [
      ...(cursor !== undefined ? [`cursor=${encodeURIComponent(cursor)}`] : []),
      ...(archived ? ['archived=true'] : []),
      ...(category !== undefined ? [`category=${encodeURIComponent(category)}`] : []),
    ];
    return apiClient.get<Page<ItineraryResponse>>(
      `/v1/itineraries${params.length > 0 ? `?${params.join('&')}` : ''}`,
    );
  },

  async fetchOne(id: string): Promise<ItineraryResponse> {
    return apiClient.get<ItineraryResponse>(`/v1/itineraries/${id}`);
  },

  async create(request: CreateItineraryRequest): Promise<ItineraryResponse> {
    return apiClient.post<ItineraryResponse>('/v1/itineraries', request);
  },


  async update(id: string, request: UpdateItineraryRequest): Promise<ItineraryResponse> {
    return apiClient.patch<ItineraryResponse>(`/v1/itineraries/${id}`, request);
  },



  async unarchiveTrip(id: string): Promise<ItineraryResponse> {
    return apiClient.post<ItineraryResponse>(`/v1/itineraries/${id}/unarchive`, undefined);
  },


  async fetchPublished(id: string): Promise<PublishedItineraryResponse> {
    return apiClient.get<PublishedItineraryResponse>(`/v1/published-itineraries/${id}`);
  },


  async fetchPreview(id: string): Promise<PublishedItineraryResponse> {
    return apiClient.get<PublishedItineraryResponse>(`/v1/itineraries/${id}/preview`);
  },


  async publishTrip(id: string, audience: PublishAudience): Promise<ItineraryResponse> {
    return apiClient.post<ItineraryResponse>(`/v1/itineraries/${id}/publish`, { audience });
  },

  async unpublishTrip(id: string): Promise<ItineraryResponse> {
    return apiClient.post<ItineraryResponse>(`/v1/itineraries/${id}/unpublish`, undefined);
  },


  async appendDay(itineraryId: string, request: DayRequest): Promise<DayResponse> {
    return apiClient.post<DayResponse>(`/v1/itineraries/${itineraryId}/days`, request);
  },

  async renameDay(itineraryId: string, dayId: string, request: DayRequest): Promise<DayResponse> {
    return apiClient.patch<DayResponse>(`/v1/itineraries/${itineraryId}/days/${dayId}`, request);
  },

  async deleteDay(itineraryId: string, dayId: string): Promise<void> {
    return apiClient.delete(`/v1/itineraries/${itineraryId}/days/${dayId}`);
  },


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


  async reorderActivities(
    itineraryId: string,
    dayId: string,
    request: ReorderActivitiesRequest,
  ): Promise<DayResponse> {
    return apiClient.put<DayResponse>(`/v1/itineraries/${itineraryId}/days/${dayId}/activities/order`, request);
  },


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


  async acquireEditLock(itineraryId: string, subject: LeaseSubject): Promise<EditLeaseResponse> {
    return apiClient.post<EditLeaseResponse>(`/v1/itineraries/${itineraryId}/edit-lock`, subject);
  },

  async renewEditLock(itineraryId: string, subject: LeaseSubject): Promise<EditLeaseResponse> {
    return apiClient.post<EditLeaseResponse>(`/v1/itineraries/${itineraryId}/edit-lock/renew`, subject);
  },

  async releaseEditLock(itineraryId: string, subject: LeaseSubject): Promise<void> {
    return apiClient.delete(`/v1/itineraries/${itineraryId}/edit-lock`, subject);
  },
};
