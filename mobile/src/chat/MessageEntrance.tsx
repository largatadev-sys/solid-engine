import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, type ViewStyle } from 'react-native';
import { useReducedMotion } from '../components/useReducedMotion';
import { chatMotion } from '../theme/workspaceTokens';


interface MessageEntranceProps {
  readonly children: ReactNode;
  readonly animate: boolean;
  readonly style?: ViewStyle;
}


export function MessageEntrance({ children, animate, style }: MessageEntranceProps) {
  const reducedMotion = useReducedMotion();
  const arrivedFresh = useRef(animate);
  const entrance = useRef(new Animated.Value(arrivedFresh.current ? 0 : 1)).current;
  const jumpCut = useRef(reducedMotion);
  jumpCut.current = reducedMotion;

  useEffect(() => {
    if (!arrivedFresh.current || jumpCut.current) {
      entrance.setValue(1);
      return;
    }

    const rising = Animated.timing(entrance, {
      toValue: 1,
      duration: chatMotion.entranceMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    rising.start();

    return () => rising.stop();
  }, [entrance]);

  const translateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [chatMotion.entranceRisePx, 0],
  });

  return (
    <Animated.View style={[style, { opacity: entrance, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
