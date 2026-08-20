import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';
import { tripTabMotion, workspaceRadii, workspaceTypography } from '../theme/workspaceTokens';
import type { StateBadge } from './workspaceControls';


export function LifecycleBadge({ badge }: { badge: StateBadge }) {
  const [shown, setShown] = useState(badge.label);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (badge.label === shown) return;

    Animated.timing(fade, {
      toValue: 0,
      duration: tripTabMotion.badgeCrossfadeMs / 2,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setShown(badge.label);
      Animated.timing(fade, {
        toValue: 1,
        duration: tripTabMotion.badgeCrossfadeMs / 2,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
  }, [badge.label, fade, shown]);

  return (
    <Animated.View
      style={[
        styles.badge,
        { backgroundColor: badge.background, borderColor: badge.border, opacity: fade },
      ]}
    >
      <Text style={[styles.label, { color: badge.foreground }]}>{shown}</Text>
    </Animated.View>
  );
}


const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: workspaceRadii.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  label: {
    ...workspaceTypography.badgeLabel,
  },
});
