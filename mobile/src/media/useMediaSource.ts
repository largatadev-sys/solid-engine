import { useEffect, useState } from 'react';
import { mediaSourceFor } from './mediaSource';
import type { MediaSource } from './mediaSourceContract';

export function useMediaSource(url: string | null): MediaSource | null {
  const [source, setSource] = useState<MediaSource | null>(null);

  useEffect(() => {
    let current = true;
    void mediaSourceFor(url).then((resolved) => {
      if (current) setSource(resolved);
    });
    return () => {
      current = false;
    };
  }, [url]);

  return source;
}
