import { cropCircular } from './CropStation';
import type { CropShape, PickedPhoto } from './pickedPhoto';

export async function pickPhoto(shape: CropShape = 'free'): Promise<PickedPhoto | null> {
  const chosen = await chooseFile();
  if (chosen === null) return null;
  return shape === 'circle' ? cropCircular(chosen) : chosen;
}


async function chooseFile(): Promise<PickedPhoto | null> {
  if (typeof document === 'undefined') return null;

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';

    const settle = (picked: PickedPhoto | null) => {
      input.remove();
      resolve(picked);
    };

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file === undefined) {
        settle(null);
        return;
      }
      settle({
        uri: URL.createObjectURL(file),
        name: file.name,
        mimeType: file.type === '' ? 'image/jpeg' : file.type,
        bytes: file,
      });
    });
    input.addEventListener('cancel', () => settle(null));

    document.body.appendChild(input);
    input.click();
  });
}
