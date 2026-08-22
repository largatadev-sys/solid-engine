export interface AvatarTint {
  readonly well: string;
  readonly ink: string;
}


export const AVATAR_TINTS: readonly AvatarTint[] = [
  { well: '#DBEAFE', ink: '#1D4ED8' },
  { well: '#FDE4CF', ink: '#C2410C' },
  { well: '#DCFCE7', ink: '#15803D' },
  { well: '#FEF9C3', ink: '#A16207' },
  { well: '#EDE9FE', ink: '#6D28D9' },
  { well: '#FCE7F3', ink: '#BE185D' },
  { well: '#CFFAFE', ink: '#0E7490' },
  { well: '#FEE2E2', ink: '#B91C1C' },
] as const;


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
