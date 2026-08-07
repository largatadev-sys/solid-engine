import type { PickedPhoto } from './pickedPhoto';

export type StagedAvatar = { kind: 'photo'; photo: PickedPhoto } | { kind: 'removed' } | null;

export function avatarPreviewOf(staged: StagedAvatar, currentUrl: string | null): string | null {
  if (staged === null) return currentUrl;
  return staged.kind === 'photo' ? staged.photo.uri : null;
}
