import type { CropArea } from './cropGeometry';
import type { CroppedImage } from './croppedImage';

export async function cropToSquare(source: string, area: CropArea): Promise<CroppedImage> {
  const image = await loadImage(source);
  const canvas = document.createElement('canvas');
  canvas.width = area.width;
  canvas.height = area.height;

  const pen = canvas.getContext('2d');
  if (pen === null) throw new Error('That photo could not be prepared for upload.');
  pen.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.92);
  });
  if (blob === null) throw new Error('That photo could not be read.');

  return { uri: URL.createObjectURL(blob), bytes: blob };
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('That image could not be read.')));
    image.src = source;
  });
}
