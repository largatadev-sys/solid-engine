export interface CropArea {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export async function cropToSquare(source: string, area: CropArea, name: string): Promise<Blob> {
  const image = await loadImage(source);
  const canvas = document.createElement('canvas');
  canvas.width = area.width;
  canvas.height = area.height;

  const pen = canvas.getContext('2d');
  if (pen === null) throw new Error(`Could not prepare ${name} for upload.`);
  pen.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob === null ? reject(new Error(`Could not read ${name}.`)) : resolve(blob)),
      'image/jpeg',
      0.92,
    );
  });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('That image could not be read.')));
    image.src = source;
  });
}
