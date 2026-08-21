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
  const settled = !animate || reducedMotion;
  const entrance = useRef(new Animated.Value(settled ? 1 : 0)).current;

  useEffect(() => {
    if (settled) {
      entrance.setValue(1);
      return;
    }
    Animated.timing(entrance, {
      toValue: 1,
      duration: chatMotion.entranceMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [entrance, settled]);

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
