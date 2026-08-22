import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '../components/useReducedMotion';
import { travelerColors, travelerMetrics, travelerMotion } from '../theme/workspaceTokens';
import { TravelerAvatar } from './TravelerAvatar';
import type { GoingTravelerResponse } from '../types/api';


export function GoingFacepile({ going }: { going: readonly GoingTravelerResponse[] }) {
  if (going.length === 0) {
    return null;
  }

  return (
    <View style={styles.pile}>
      {going.map((traveler, at) => (
        <PopIn key={traveler.travelerId} index={at}>
          <View style={[styles.ring, at > 0 && styles.overlap]}>
            <TravelerAvatar
              tintKey={traveler.travelerId}
              displayName={traveler.displayName}
              avatarUrl={traveler.avatarUrl}
              size={travelerMetrics.facepileAvatar}
            />
          </View>
        </PopIn>
      ))}
    </View>
  );
}


function PopIn({ index, children }: { index: number; children: React.ReactNode }) {
  const scale = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    Animated.timing(scale, {
      toValue: 1,
      duration: reducedMotion ? 0 : travelerMotion.popMs,
      delay: reducedMotion ? 0 : index * travelerMotion.popStaggerMs,
      easing: Easing.bezier(0.34, 1.56, 0.64, 1),
      useNativeDriver: true,
    }).start();
  }, [index, reducedMotion, scale]);

  return (
    <Animated.View style={{ opacity: scale, transform: [{ scale }] }}>{children}</Animated.View>
  );
}


const styles = StyleSheet.create({
  pile: {
    flexDirection: 'row',
  },
  ring: {
    borderWidth: travelerMetrics.facepileRing,
    borderColor: travelerColors.surface,
    borderRadius: 999,
  },
  overlap: {
    marginLeft: travelerMetrics.facepileOverlap,
  },
});
