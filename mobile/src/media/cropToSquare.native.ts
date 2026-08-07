import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { CropArea } from './cropGeometry';
import type { CroppedImage } from './croppedImage';
import { UPLOAD_JPEG_QUALITY, UPLOAD_MAX_EDGE } from './uploadBound';

export async function cropToSquare(source: string, area: CropArea): Promise<CroppedImage> {
  const cropped = ImageManipulator.manipulate(source).crop({
    originX: area.x,
    originY: area.y,
    width: area.width,
    height: area.height,
  });
  const context =
    area.width > UPLOAD_MAX_EDGE ? cropped.resize({ width: UPLOAD_MAX_EDGE }) : cropped;
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: UPLOAD_JPEG_QUALITY });
  return { uri: saved.uri };
}
