import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useAuth } from '../hooks/authContext';
import type { PickedPhoto } from '../media/pickedPhoto';
import { travelerRepository } from '../repositories/travelerRepository';
import { verificationRepository } from '../repositories/verificationRepository';
import type {
  HandleAvailabilityResponse,
  MeResponse,
  TravelerCardResponse,
  UpdateProfileRequest,
  VerificationCodeResponse,
} from '../types/api';


export const HANDLE_MIN_LENGTH = 3;

const HANDLE_FRESHNESS_MS = 30_000;


export const meKeys = {
  me: ['me'] as const,

  handles: ['handle'] as const,
  handle: (handle: string) => ['handle', handle] as const,

  handleLookup: (handle: string) => ['handle', 'lookup', handle] as const,
};


export const meOptions = queryOptions({
  queryKey: meKeys.me,
  queryFn: () => travelerRepository.fetchMe(),
});


export function useHandleAvailability(
  handle: string,
  stored: string | null = null,
): UseQueryResult<HandleAvailabilityResponse> {
  const { kind } = useAuth();
  return useQuery({
    queryKey: meKeys.handle(handle),
    queryFn: () => travelerRepository.checkHandle(handle),
    enabled: kind === 'signedIn' && handle !== stored && handle.length >= HANDLE_MIN_LENGTH,
    staleTime: HANDLE_FRESHNESS_MS,
  });
}


export function useTravelerByHandle(handle: string): UseQueryResult<TravelerCardResponse> {
  const { kind } = useAuth();
  return useQuery({
    queryKey: meKeys.handleLookup(handle),
    queryFn: () => travelerRepository.findByHandle(handle),
    enabled: kind === 'signedIn' && handle.length > 0,
    staleTime: HANDLE_FRESHNESS_MS,
    retry: false,
  });
}


export function useUpdateProfile(): UseMutationResult<MeResponse, Error, UpdateProfileRequest> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (request: UpdateProfileRequest) => travelerRepository.updateProfile(request),
    onSuccess: (updated) => onProfileChanged(client, updated),
  });
}


export function useCompleteOnboarding(): UseMutationResult<MeResponse, Error, void> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => travelerRepository.completeOnboarding(),
    onSuccess: (updated) => onProfileChanged(client, updated),
  });
}


export function useUploadAvatar(): UseMutationResult<MeResponse, Error, PickedPhoto> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (photo: PickedPhoto) => travelerRepository.uploadAvatar(photo),
    onSuccess: (updated) => onProfileChanged(client, updated),
  });
}


export function useRemoveAvatar(): UseMutationResult<void, Error, void> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => travelerRepository.removeAvatar(),
    onSuccess: () => client.invalidateQueries({ queryKey: meKeys.me }),
  });
}


export function useSendVerificationCode(): UseMutationResult<VerificationCodeResponse, Error, void> {
  return useMutation({ mutationFn: () => verificationRepository.sendCode() });
}


export function useConfirmVerificationCode(): UseMutationResult<void, Error, string> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      await verificationRepository.confirmCode(code);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: meKeys.me }),
  });
}


export async function onProfileChanged(client: QueryClient, updated: MeResponse): Promise<void> {
  client.setQueryData(meKeys.me, updated);
  await client.invalidateQueries({ queryKey: meKeys.handles });
}
