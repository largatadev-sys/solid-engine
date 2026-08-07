import { downscaleTarget } from './cropGeometry';
import type { PickedPhoto } from './pickedPhoto';
import { UPLOAD_JPEG_QUALITY, UPLOAD_MAX_EDGE } from './uploadBound';

export async function downscaleForUpload(photo: PickedPhoto): Promise<PickedPhoto> {
  try {
    const image = await loadImage(photo.uri);
    const target = downscaleTarget(
      { width: image.naturalWidth, height: image.naturalHeight },
      UPLOAD_MAX_EDGE,
    );
    if (target === null) return photo;

    const canvas = document.createElement('canvas');
    canvas.width = target.width;
    canvas.height = target.height;
    const pen = canvas.getContext('2d');
    if (pen === null) return photo;
    pen.drawImage(image, 0, 0, target.width, target.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', UPLOAD_JPEG_QUALITY);
    });
    if (blob === null) return photo;

    return { uri: URL.createObjectURL(blob), name: photo.name, mimeType: 'image/jpeg', bytes: blob };
  } catch {
    return photo;
  }
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('That image could not be read.')));
    image.src = source;
  });
}
