import * as ImagePicker from 'expo-image-picker';
import { cropCircular } from './CropStation';
import { downscaleForUpload } from './downscale';
import type { CropShape, PickedPhoto } from './pickedPhoto';

export async function pickPhotos(limit: number): Promise<PickedPhoto[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return [];

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: limit,
    quality: 1,
  });
  if (result.canceled) return [];

  return Promise.all(
    result.assets.slice(0, limit).map((asset) =>
      downscaleForUpload({
        uri: asset.uri,
        name: asset.fileName ?? 'photo.jpg',
        mimeType: asset.mimeType ?? 'image/jpeg',
      }),
    ),
  );
}


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

  return shape === 'circle' ? cropCircular(chosen) : downscaleForUpload(chosen);
}
