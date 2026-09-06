import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useAuth } from '../hooks/authContext';
import { memoryRepository } from '../repositories/memoryRepository';
import type { DiaryResponse, DiarySectionsResponse, PostcardResponse } from '../types/api';


export const memoryKeys = {
  all: ['memory'] as const,

  sections: (handle: string) => [...memoryKeys.all, 'sections', handle] as const,

  diary: (diaryId: string) => [...memoryKeys.all, 'diary', diaryId] as const,

  postcard: (postcardId: string) => [...memoryKeys.all, 'postcard', postcardId] as const,
};


export function useDiarySections(handle: string | null): UseQueryResult<DiarySectionsResponse> {
  const { kind } = useAuth();

  return useQuery({
    queryKey: memoryKeys.sections(handle ?? ''),
    queryFn: () => memoryRepository.fetchSections(handle as string),
    enabled: kind === 'signedIn' && handle !== null,
  });
}


export function useDiary(diaryId: string | null): UseQueryResult<DiaryResponse> {
  const { kind } = useAuth();

  return useQuery({
    queryKey: memoryKeys.diary(diaryId ?? ''),
    queryFn: () => memoryRepository.fetchDiary(diaryId as string),
    enabled: kind === 'signedIn' && diaryId !== null,
  });
}


export function usePostcard(postcardId: string | null): UseQueryResult<PostcardResponse> {
  const { kind } = useAuth();

  return useQuery({
    queryKey: memoryKeys.postcard(postcardId ?? ''),
    queryFn: () => memoryRepository.fetchPostcard(postcardId as string),
    enabled: kind === 'signedIn' && postcardId !== null,
  });
}


export function useMemoryRefresh(): (handle: string | null) => void {
  const client = useQueryClient();

  return (handle) => {
    void client.invalidateQueries({ queryKey: memoryKeys.all });
    if (handle !== null) {
      void client.invalidateQueries({ queryKey: memoryKeys.sections(handle) });
    }
  };
}
