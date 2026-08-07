export interface PickedPhoto {
  readonly uri: string;
  readonly name: string;
  readonly mimeType: string;
  readonly bytes?: Blob;
}

export type CropShape = 'circle' | 'free';
