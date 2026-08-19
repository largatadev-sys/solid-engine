import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, type ViewStyle } from 'react-native';
import { pollMotion } from '../theme/workspaceTokens';


interface FadeUpProps {
  readonly children: ReactNode;
  readonly style?: ViewStyle;
}


export function FadeUp({ children, style }: FadeUpProps) {
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: pollMotion.swapMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  const translateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [pollMotion.swapRisePx, 0],
  });

  return (
    <Animated.View style={[style, { opacity: entrance, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
