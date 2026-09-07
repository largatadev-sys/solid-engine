import { useCallback, useEffect, useRef, useState } from 'react';
import { memoryMotion } from '../theme/memoryTokens';
import type { DiarySectionsResponse } from '../types/api';


export type MemoryExits = {
  readonly exiting: readonly string[];
  readonly hidden: readonly string[];
  readonly entering: readonly string[];
  readonly begin: (id: string) => void;
  readonly revert: (id: string) => void;
};


export function useMemoryExits(): MemoryExits {
  const [exiting, setExiting] = useState<readonly string[]>([]);
  const [hidden, setHidden] = useState<readonly string[]>([]);
  const [entering, setEntering] = useState<readonly string[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const later = useCallback((ms: number, run: () => void) => {
    timers.current.push(setTimeout(run, ms));
  }, []);

  const begin = useCallback(
    (id: string) => {
      setEntering((rows) => rows.filter((row) => row !== id));
      setExiting((rows) => (rows.includes(id) ? rows : [...rows, id]));
      later(memoryMotion.rowExitMs, () => {
        setExiting((rows) => rows.filter((row) => row !== id));
        setHidden((rows) => (rows.includes(id) ? rows : [...rows, id]));
      });
    },
    [later],
  );

  const revert = useCallback(
    (id: string) => {
      setExiting((rows) => rows.filter((row) => row !== id));
      setHidden((rows) => rows.filter((row) => row !== id));
      setEntering((rows) => (rows.includes(id) ? rows : [...rows, id]));
      later(memoryMotion.rowEnterMs, () =>
        setEntering((rows) => rows.filter((row) => row !== id)),
      );
    },
    [later],
  );

  return { exiting, hidden, entering, begin, revert };
}


export function sectionsShown(
  data: DiarySectionsResponse,
  hidden: readonly string[],
): DiarySectionsResponse {
  const hiddenDiaries = data.diaries.filter((diary) => hidden.includes(diary.id)).length;
  return {
    diaries: data.diaries.filter((diary) => !hidden.includes(diary.id)),
    loosePostcards: data.loosePostcards.filter((postcard) => !hidden.includes(postcard.id)),
    diaryCount: Math.max(0, data.diaryCount - hiddenDiaries),
  };
}
