import { travelerAvatarTints } from '../theme/workspaceTokens';


export interface AvatarTint {
  readonly well: string;
  readonly ink: string;
}


export const AVATAR_TINTS: readonly AvatarTint[] = travelerAvatarTints;


export function tintIndexFor(travelerId: string, paletteSize: number = AVATAR_TINTS.length): number {
  if (paletteSize <= 0) return 0;

  let hash = 0;
  for (const character of travelerId) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }
  return Math.abs(hash) % paletteSize;
}


export function tintFor(travelerId: string): AvatarTint {
  return AVATAR_TINTS[tintIndexFor(travelerId)] ?? AVATAR_TINTS[0]!;
}
