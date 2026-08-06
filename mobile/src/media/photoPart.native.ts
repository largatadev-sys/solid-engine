import type { PickedPhoto } from './pickedPhoto';

export async function photoPart(photo: PickedPhoto): Promise<FormData> {
  const part = new FormData();
  part.append('photo', {
    uri: photo.uri,
    name: photo.name,
    type: photo.mimeType,
  } as unknown as Blob);
  return part;
}
