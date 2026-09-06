import { apiClient } from '../api/apiClient';
import { appendPhoto } from '../media/appendPhoto';
import type { PickedPhoto } from '../media/pickedPhoto';
import type {
  AddDiaryDayRequest,
  CreateDiaryRequest,
  CreatePostcardRequest,
  DiaryDayResponse,
  DiaryResponse,
  DiarySectionsResponse,
  PostOnDayRequest,
  PostcardResponse,
} from '../types/api';


export const memoryRepository = {

  async createDiary(request: CreateDiaryRequest): Promise<DiaryResponse> {
    return apiClient.post<DiaryResponse>('/v1/diaries', request);
  },


  async fetchDiary(diaryId: string): Promise<DiaryResponse> {
    return apiClient.get<DiaryResponse>(`/v1/diaries/${diaryId}`);
  },


  async describeDiary(diaryId: string, request: CreateDiaryRequest): Promise<DiaryResponse> {
    return apiClient.patch<DiaryResponse>(`/v1/diaries/${diaryId}`, request);
  },


  async deleteDiary(diaryId: string): Promise<void> {
    return apiClient.delete(`/v1/diaries/${diaryId}`);
  },


  async setCover(diaryId: string, photo: PickedPhoto): Promise<DiaryResponse> {
    const part = new FormData();
    appendPhoto(part, 'photo', photo);

    return apiClient.upload<DiaryResponse>(`/v1/diaries/${diaryId}/cover`, part, 'PUT');
  },


  async removeCover(diaryId: string): Promise<DiaryResponse> {
    return apiClient.delete<DiaryResponse>(`/v1/diaries/${diaryId}/cover`);
  },


  async addDay(diaryId: string, request: AddDiaryDayRequest): Promise<DiaryDayResponse> {
    return apiClient.post<DiaryDayResponse>(`/v1/diaries/${diaryId}/days`, request);
  },


  async placeDay(diaryId: string, dayId: string, place: string | null): Promise<DiaryDayResponse> {
    return apiClient.patch<DiaryDayResponse>(`/v1/diaries/${diaryId}/days/${dayId}`, { place });
  },


  async deleteDay(diaryId: string, dayId: string): Promise<void> {
    return apiClient.delete(`/v1/diaries/${diaryId}/days/${dayId}`);
  },


  async postOnDay(
    diaryId: string,
    dayId: string,
    postcard: PostOnDayRequest,
    devicePhotos: readonly PickedPhoto[],
  ): Promise<PostcardResponse> {
    const part = new FormData();
    part.append('postcard', JSON.stringify(postcard));
    devicePhotos.forEach((photo) => appendPhoto(part, 'photos', photo));

    return apiClient.upload<PostcardResponse>(
      `/v1/diaries/${diaryId}/days/${dayId}/postcards`,
      part,
    );
  },


  async postLoosePostcard(
    postcard: CreatePostcardRequest,
    devicePhotos: readonly PickedPhoto[],
  ): Promise<PostcardResponse> {
    const part = new FormData();
    part.append('postcard', JSON.stringify(postcard));
    devicePhotos.forEach((photo) => appendPhoto(part, 'photos', photo));

    return apiClient.upload<PostcardResponse>('/v1/postcards', part);
  },


  async fileOnDay(postcardId: string, diaryId: string, dayId: string): Promise<PostcardResponse> {
    return apiClient.patch<PostcardResponse>(`/v1/postcards/${postcardId}`, {
      diaryId,
      diaryDayId: dayId,
    });
  },


  async fetchPostcard(postcardId: string): Promise<PostcardResponse> {
    return apiClient.get<PostcardResponse>(`/v1/postcards/${postcardId}`);
  },


  async recaptionPostcard(postcardId: string, caption: string | null): Promise<PostcardResponse> {
    return apiClient.patch<PostcardResponse>(`/v1/postcards/${postcardId}`, { caption });
  },


  async deletePostcard(postcardId: string): Promise<void> {
    return apiClient.delete(`/v1/postcards/${postcardId}`);
  },


  async fetchSections(handle: string): Promise<DiarySectionsResponse> {
    return apiClient.get<DiarySectionsResponse>(
      `/v1/travelers/${encodeURIComponent(handle)}/diaries`,
    );
  },
};
