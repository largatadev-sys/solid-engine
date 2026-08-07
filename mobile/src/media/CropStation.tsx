import { useEffect, useState } from 'react';
import { CircularCropper } from './CircularCropper';
import type { CropArea, Size } from './cropGeometry';
import { cropToSquare } from './cropToSquare';
import { imageSize } from './imageSize';
import type { PickedPhoto } from './pickedPhoto';

interface Pending {
  readonly photo: PickedPhoto;
  readonly size: Size;
  readonly settle: (cropped: PickedPhoto | null) => void;
}

let present: ((pending: Pending) => void) | null = null;

export async function cropCircular(photo: PickedPhoto): Promise<PickedPhoto | null> {
  if (present === null) return photo;
  const size = await imageSize(photo.uri).catch(() => null);
  if (size === null) return photo;
  return new Promise((settle) => present?.({ photo, size, settle }));
}


export function CropStation() {
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    present = setPending;
    return () => {
      present = null;
    };
  }, []);

  const finish = async (area: CropArea) => {
    if (pending === null) return;
    const { photo, settle } = pending;
    setPending(null);
    try {
      const cropped = await cropToSquare(photo.uri, area);
      settle({
        uri: cropped.uri,
        name: photo.name,
        mimeType: 'image/jpeg',
        ...(cropped.bytes === undefined ? {} : { bytes: cropped.bytes }),
      });
    } catch {
      settle(photo);
    }
  };

  return (
    <CircularCropper
      source={pending?.photo.uri ?? null}
      imageSize={pending?.size ?? null}
      onCancel={() => {
        pending?.settle(null);
        setPending(null);
      }}
      onConfirm={(area) => void finish(area)}
    />
  );
}
