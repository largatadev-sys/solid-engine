import { useRef } from 'react';
import { setDockVisibility } from './feedbackDockState';
import { afterTap, NO_TAPS, reveals, type TapRun } from './revealTaps';


export function useRevealGesture(): { readonly onPress: () => void } {
  const run = useRef<TapRun>(NO_TAPS);

  return {
    onPress: () => {
      run.current = afterTap(run.current, Date.now());
      if (!reveals(run.current)) return;
      run.current = NO_TAPS;
      setDockVisibility('revealed');
    },
  };
}
