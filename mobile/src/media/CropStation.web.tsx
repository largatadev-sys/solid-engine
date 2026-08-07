import { useEffect, useState } from 'react';
import { CircularCropper } from './CircularCropper.web';
import { cropToSquare, type CropArea } from './cropToSquare.web';
import type { PickedPhoto } from './pickedPhoto';

type Pending = {
  readonly photo: PickedPhoto;
  readonly settle: (cropped: PickedPhoto | null) => void;
};

let open: ((pending: Pending) => void) | null = null;

export function cropCircular(photo: PickedPhoto): Promise<PickedPhoto | null> {
  if (open === null) return Promise.resolve(photo);
  return new Promise((settle) => open?.({ photo, settle }));
}


export function CropStation() {
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    open = setPending;
    return () => {
      open = null;
    };
  }, []);

  const finish = async (area: CropArea) => {
    if (pending === null) return;
    const { photo, settle } = pending;
    setPending(null);
    try {
      const bytes = await cropToSquare(photo.uri, area, photo.name);
      settle({
        uri: URL.createObjectURL(bytes),
        name: photo.name,
        mimeType: 'image/jpeg',
        bytes,
      });
    } catch {
      settle(photo);
    }
  };

  return (
    <CircularCropper
      source={pending?.photo.uri ?? null}
      onCancel={() => {
        pending?.settle(null);
        setPending(null);
      }}
      onConfirm={(area) => void finish(area)}
    />
  );
}
