import * as ImagePicker from 'expo-image-picker';
import { cropCircular } from './CropStation';
import type { CropShape, PickedPhoto } from './pickedPhoto';

export async function pickPhoto(shape: CropShape = 'free'): Promise<PickedPhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: shape !== 'circle',
    quality: 1,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (asset === undefined) return null;

  const chosen = {
    uri: asset.uri,
    name: asset.fileName ?? 'photo.jpg',
    mimeType: asset.mimeType ?? 'image/jpeg',
  };

  return shape === 'circle' ? cropCircular(chosen) : chosen;
}
