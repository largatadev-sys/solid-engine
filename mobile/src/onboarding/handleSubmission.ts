import type { MeResponse, UpdateProfileRequest } from '../types/api';


export function profileSaveFor(
  typed: { handle: string; displayName: string; bio: string },
  me: MeResponse | null,
): UpdateProfileRequest {
  const changed = typed.handle !== (me?.handle ?? null);
  return {
    ...(changed ? { handle: typed.handle } : {}),
    displayName: typed.displayName.trim(),
    bio: typed.bio.trim(),
  };
}
