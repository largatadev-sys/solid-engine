import type { Size } from './cropGeometry';

export function imageSize(uri: string): Promise<Size> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () =>
      resolve({ width: image.naturalWidth, height: image.naturalHeight }),
    );
    image.addEventListener('error', () => reject(new Error('That image could not be measured.')));
    image.src = uri;
  });
}
