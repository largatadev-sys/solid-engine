import { useCallback } from 'react';
import { LayoutAnimation } from 'react-native';
import { useReducedMotion } from '../components/useReducedMotion';
import { travelerMotion } from '../theme/workspaceTokens';


export function useLayoutClose(): () => void {
  const reducedMotion = useReducedMotion();

  return useCallback(() => {
    if (reducedMotion) return;
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        travelerMotion.layoutMs,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity,
      ),
    );
  }, [reducedMotion]);
}
