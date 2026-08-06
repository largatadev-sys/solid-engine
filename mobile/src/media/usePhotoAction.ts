import { useState } from 'react';
import { pickPhoto } from './pickPhoto';
import { messageForPhotoFailure } from './photoMessages';
import type { PickedPhoto } from './pickedPhoto';

interface PhotoAction {
  readonly failure: string | undefined;
  readonly clearFailure: () => void;
  readonly pickAndRun: (run: (photo: PickedPhoto) => Promise<unknown>) => Promise<void>;
  readonly run: (action: () => Promise<unknown>) => Promise<void>;
}

export function usePhotoAction(): PhotoAction {
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
      const picked = await pickPhoto();
      if (picked === null) return;
      await run(() => withPhoto(picked));
    },
  };
}
