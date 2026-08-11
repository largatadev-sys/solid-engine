import { File } from 'expo-file-system';
import type { PickedPhoto } from './pickedPhoto';

export function appendPhoto(part: FormData, field: string, photo: PickedPhoto): void {
  part.append(field, new File(photo.uri) as unknown as Blob, photo.name);
}
