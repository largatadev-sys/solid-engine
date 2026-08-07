import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { downscaleTarget } from './cropGeometry';
import { imageSize } from './imageSize';
import type { PickedPhoto } from './pickedPhoto';
import { UPLOAD_JPEG_QUALITY, UPLOAD_MAX_EDGE } from './uploadBound';

export async function downscaleForUpload(photo: PickedPhoto): Promise<PickedPhoto> {
  try {
    const size = await imageSize(photo.uri);
    const target = downscaleTarget(size, UPLOAD_MAX_EDGE);
    if (target === null) return photo;

    const context = ImageManipulator.manipulate(photo.uri).resize(
      size.width >= size.height ? { width: UPLOAD_MAX_EDGE } : { height: UPLOAD_MAX_EDGE },
    );
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: UPLOAD_JPEG_QUALITY });

    return { uri: saved.uri, name: photo.name, mimeType: 'image/jpeg' };
  } catch {
    return photo;
  }
}
