import * as ImagePicker from 'expo-image-picker';
import type { CropShape, PickedPhoto } from './pickedPhoto';

export async function pickPhoto(shape: CropShape = 'free'): Promise<PickedPhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 1,
    ...(shape === 'circle'
      ? { aspect: [1, 1] as [number, number], shape: 'oval' as const }
      : {}),
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (asset === undefined) return null;

  return {
    uri: asset.uri,
    name: asset.fileName ?? 'photo.jpg',
    mimeType: asset.mimeType ?? 'image/jpeg',
  };
}
