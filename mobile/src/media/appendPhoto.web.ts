import type { PickedPhoto } from './pickedPhoto';

export function appendPhoto(part: FormData, field: string, photo: PickedPhoto): void {
  if (photo.bytes === undefined) {
    throw new Error('The chosen photo carried no bytes to upload.');
  }
  part.append(field, photo.bytes, photo.name);
}
