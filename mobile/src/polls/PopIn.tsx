import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, type ViewStyle } from 'react-native';
import { pollMotion } from '../theme/workspaceTokens';


const OVERSHOOT = Easing.bezier(0.34, 1.56, 0.64, 1);


interface PopInProps {
  readonly children: ReactNode;
  readonly style?: ViewStyle;
}


export function PopIn({ children, style }: PopInProps) {
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: pollMotion.markerPopMs,
      easing: OVERSHOOT,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  const scale = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [pollMotion.markerFromScale, 1],
  });

  return (
    <Animated.View style={[style, { opacity: entrance, transform: [{ scale }] }]}>
      {children}
    </Animated.View>
  );
}
