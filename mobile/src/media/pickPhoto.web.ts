import { cropCircular } from './CropStation';
import { downscaleForUpload } from './downscale';
import type { CropShape, PickedPhoto } from './pickedPhoto';

export async function pickPhotos(limit: number): Promise<PickedPhoto[]> {
  const chosen = await chooseFiles(true);
  return Promise.all(chosen.slice(0, limit).map((photo) => downscaleForUpload(photo)));
}


export async function pickPhoto(shape: CropShape = 'free'): Promise<PickedPhoto | null> {
  const chosen = (await chooseFiles(false))[0] ?? null;
  if (chosen === null) return null;
  return shape === 'circle' ? cropCircular(chosen) : downscaleForUpload(chosen);
}


async function chooseFiles(multiple: boolean): Promise<PickedPhoto[]> {
  if (typeof document === 'undefined') return [];

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = multiple;
    input.style.display = 'none';

    const settle = (picked: PickedPhoto[]) => {
      input.remove();
      resolve(picked);
    };

    input.addEventListener('change', () => {
      settle(
        Array.from(input.files ?? []).map((file) => ({
          uri: URL.createObjectURL(file),
          name: file.name,
          mimeType: file.type === '' ? 'image/jpeg' : file.type,
          bytes: file,
        })),
      );
    });
    input.addEventListener('cancel', () => settle([]));

    document.body.appendChild(input);
    input.click();
  });
}
