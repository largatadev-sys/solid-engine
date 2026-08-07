import { File } from 'expo-file-system';
import type { PickedPhoto } from './pickedPhoto';

export async function photoPart(photo: PickedPhoto): Promise<FormData> {
  const part = new FormData();
  part.append('photo', new File(photo.uri), photo.name);
  return part;
}
