import { apiClient } from '../api/apiClient';
import { appendPhoto } from '../media/appendPhoto';
import type { PickedPhoto } from '../media/pickedPhoto';
import type {
  DiaryEntryResponse,
  DiaryTripResponse,
  Page,
  PostDiaryEntryRequest,
} from '../types/api';


export const diaryRepository = {

  async fetchMine(itineraryId: string, cursor?: string): Promise<Page<DiaryEntryResponse>> {
    const query = cursor === undefined ? '' : `?cursor=${encodeURIComponent(cursor)}`;
    return apiClient.get<Page<DiaryEntryResponse>>(
      `/v1/itineraries/${itineraryId}/diary/entries${query}`,
    );
  },


  async fetchEveryEntry(itineraryId: string): Promise<DiaryEntryResponse[]> {
    const everyEntry: DiaryEntryResponse[] = [];
    const cursorsFollowed = new Set<string>();
    let cursor: string | undefined;

    for (;;) {
      const page = await this.fetchMine(itineraryId, cursor);
      everyEntry.push(...page.items);

      cursor = page.nextCursor ?? undefined;
      if (cursor === undefined || cursorsFollowed.has(cursor)) return everyEntry;
      cursorsFollowed.add(cursor);
    }
  },


  async post(
    itineraryId: string,
    entry: PostDiaryEntryRequest,
    devicePhotos: readonly PickedPhoto[],
  ): Promise<DiaryEntryResponse> {
    const part = new FormData();
    part.append('entry', JSON.stringify(entry));
    devicePhotos.forEach((photo) => appendPhoto(part, 'photos', photo));

    return apiClient.upload<DiaryEntryResponse>(
      `/v1/itineraries/${itineraryId}/diary/entries`,
      part,
    );
  },


  async recaption(
    itineraryId: string,
    entryId: string,
    caption: string | null,
  ): Promise<DiaryEntryResponse> {
    return apiClient.patch<DiaryEntryResponse>(
      `/v1/itineraries/${itineraryId}/diary/entries/${entryId}`,
      { caption },
    );
  },


  async addDevicePhoto(
    itineraryId: string,
    entryId: string,
    photo: PickedPhoto,
  ): Promise<DiaryEntryResponse> {
    const part = new FormData();
    appendPhoto(part, 'photo', photo);

    return apiClient.upload<DiaryEntryResponse>(
      `/v1/itineraries/${itineraryId}/diary/entries/${entryId}/photos`,
      part,
    );
  },


  async addPhotoFromDump(
    itineraryId: string,
    entryId: string,
    photoId: string,
  ): Promise<DiaryEntryResponse> {
    return apiClient.post<DiaryEntryResponse>(
      `/v1/itineraries/${itineraryId}/diary/entries/${entryId}/photos/from-dump`,
      { photoId },
    );
  },


  async removePhoto(itineraryId: string, entryId: string, photoId: string): Promise<void> {
    return apiClient.delete(
      `/v1/itineraries/${itineraryId}/diary/entries/${entryId}/photos/${photoId}`,
    );
  },


  async remove(itineraryId: string, entryId: string): Promise<void> {
    return apiClient.delete(`/v1/itineraries/${itineraryId}/diary/entries/${entryId}`);
  },


  async fetchMyTrips(cursor?: string): Promise<Page<DiaryTripResponse>> {
    const query = cursor === undefined ? '' : `?cursor=${encodeURIComponent(cursor)}`;
    return apiClient.get<Page<DiaryTripResponse>>(`/v1/me/diary/trips${query}`);
  },
};
