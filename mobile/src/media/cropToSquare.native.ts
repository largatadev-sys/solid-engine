import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { CropArea } from './cropGeometry';
import type { CroppedImage } from './croppedImage';

export async function cropToSquare(source: string, area: CropArea): Promise<CroppedImage> {
  const context = ImageManipulator.manipulate(source).crop({
    originX: area.x,
    originY: area.y,
    width: area.width,
    height: area.height,
  });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.92 });
  return { uri: saved.uri };
}
