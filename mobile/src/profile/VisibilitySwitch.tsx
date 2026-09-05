import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { useReducedMotion } from '../components/useReducedMotion';
import {
  followColors,
  followMetrics,
  publicProfileMotion,
  workspaceColors,
} from '../theme/workspaceTokens';


interface VisibilitySwitchProps {
  readonly on: boolean;
  readonly onFlip: () => void;
  readonly label: string;
}


export function VisibilitySwitch({ on, onFlip, label }: VisibilitySwitchProps) {
  const reducedMotion = useReducedMotion();
  const slide = useRef(new Animated.Value(on ? 1 : 0)).current;

  useEffect(() => {
    if (reducedMotion) {
      slide.setValue(on ? 1 : 0);
      return;
    }
    Animated.timing(slide, {
      toValue: on ? 1 : 0,
      duration: publicProfileMotion.switchTrackMs,
      easing: Easing.bezier(0.2, 0, 0, 1),
      useNativeDriver: false,
    }).start();
  }, [slide, on, reducedMotion]);

  const travel = followMetrics.switchWidth - followMetrics.switchKnob - TRACK_INSET * 2;

  return (
    <Pressable
      onPress={onFlip}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
    >
      <Animated.View
        style={[
          styles.track,
          {
            backgroundColor: slide.interpolate({
              inputRange: [0, 1],
              outputRange: [followColors.rowChevron, workspaceColors.accent],
            }),
          },
        ]}
      >
        <Animated.View
          style={[
            styles.knob,
            { transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [0, travel] }) }] },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}


const TRACK_INSET = 3;

const styles = StyleSheet.create({
  track: {
    width: followMetrics.switchWidth,
    height: followMetrics.switchHeight,
    borderRadius: followMetrics.switchHeight / 2,
    padding: TRACK_INSET,
    justifyContent: 'center',
  },
  knob: {
    width: followMetrics.switchKnob,
    height: followMetrics.switchKnob,
    borderRadius: followMetrics.switchKnob / 2,
    backgroundColor: followColors.followingWell,
  },
});
