import { Image } from 'react-native';
import type { Size } from './cropGeometry';

export function imageSize(uri: string): Promise<Size> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => reject(new Error('That image could not be measured.')),
    );
  });
}
