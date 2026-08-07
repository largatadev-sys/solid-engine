import type { PickedPhoto } from './pickedPhoto';

export async function photoPart(photo: PickedPhoto): Promise<FormData> {
  const part = new FormData();
  if (photo.bytes === undefined) {
    throw new Error('The chosen photo carried no bytes to upload.');
  }
  part.append('photo', photo.bytes, photo.name);
  return part;
}
