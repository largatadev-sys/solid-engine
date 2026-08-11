import { useState } from 'react';
import { pickPhoto, pickPhotos } from './pickPhoto';
import { messageForPhotoFailure } from './photoMessages';
import type { CropShape, PickedPhoto } from './pickedPhoto';

interface PhotoAction {
  readonly failure: string | undefined;
  readonly clearFailure: () => void;
  readonly pickAndRun: (run: (photo: PickedPhoto) => Promise<unknown>) => Promise<void>;
  readonly pickManyAndRun: (
    limit: number,
    run: (photos: PickedPhoto[]) => Promise<unknown>,
  ) => Promise<void>;
  readonly run: (action: () => Promise<unknown>) => Promise<void>;
}

export function usePhotoAction(shape: CropShape = 'free'): PhotoAction {
  const [failure, setFailure] = useState<string | undefined>();

  const run = async (action: () => Promise<unknown>) => {
    setFailure(undefined);
    try {
      await action();
    } catch (error) {
      setFailure(messageForPhotoFailure(error));
    }
  };

  return {
    failure,
    clearFailure: () => setFailure(undefined),
    run,
    pickAndRun: async (withPhoto) => {
      setFailure(undefined);
      const picked = await pickPhoto(shape);
      if (picked === null) return;
      await run(() => withPhoto(picked));
    },
    pickManyAndRun: async (limit, withPhotos) => {
      setFailure(undefined);
      const picked = await pickPhotos(limit);
      if (picked.length === 0) return;
      await run(() => withPhotos(picked));
    },
  };
}
