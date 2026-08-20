import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import { useReducedMotion } from '../components/useReducedMotion';
import {
  tripTabColors,
  tripTabMetrics,
  tripTabMotion,
  tripTabTypography,
} from '../theme/workspaceTokens';
import { TAB_ROW_LABEL, TRIP_TABS, tabLabel, type TripTab } from './tripTabs';


interface TripTabRowProps {
  readonly selected: TripTab;
  readonly onSelect: (tab: TripTab) => void;
}


export function TripTabRow({ selected, onSelect }: TripTabRowProps) {
  const [rowWidth, setRowWidth] = useState(0);
  const slide = useRef(new Animated.Value(TRIP_TABS.indexOf(selected))).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    Animated.timing(slide, {
      toValue: TRIP_TABS.indexOf(selected),
      duration: reducedMotion ? 0 : tripTabMotion.underlineMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [reducedMotion, selected, slide]);

  const tabWidth = rowWidth / TRIP_TABS.length;
  const translateX = slide.interpolate({
    inputRange: [0, TRIP_TABS.length - 1],
    outputRange: [0, tabWidth * (TRIP_TABS.length - 1)],
  });

  const measure = (event: LayoutChangeEvent) => setRowWidth(event.nativeEvent.layout.width);

  return (
    <View
      style={styles.row}
      onLayout={measure}
      accessibilityRole="tablist"
      aria-label={TAB_ROW_LABEL}
      accessibilityLabel={TAB_ROW_LABEL}>
      {TRIP_TABS.map((tab) => (
        <TripTab key={tab} tab={tab} active={tab === selected} onSelect={onSelect} />
      ))}

      {rowWidth > 0 && (
        <Animated.View
          style={[styles.underline, { width: tabWidth, transform: [{ translateX }] }]}
          pointerEvents="none"
        />
      )}
    </View>
  );
}


function TripTab({
  tab,
  active,
  onSelect,
}: {
  readonly tab: TripTab;
  readonly active: boolean;
  readonly onSelect: (tab: TripTab) => void;
}) {
  const { opacity, onPressIn, onPressOut } = usePressFeedback();
  const selection = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(selection, {
      toValue: active ? 1 : 0,
      duration: tripTabMotion.labelColorMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [active, selection]);

  const color = selection.interpolate({
    inputRange: [0, 1],
    outputRange: [tripTabColors.labelIdle, tripTabColors.labelActive],
  });

  return (
    <AnimatedPressable
      style={[styles.tab, { opacity }]}
      onPress={() => onSelect(tab)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      aria-selected={active}
      accessibilityLabel={tabLabel(tab)}>
      <Animated.Text style={[active ? styles.labelActive : styles.label, { color }]}>
        {tabLabel(tab)}
      </Animated.Text>
    </AnimatedPressable>
  );
}


const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    height: tripTabMetrics.rowHeight,
    borderBottomWidth: 1,
    borderBottomColor: tripTabColors.hairline,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...tripTabTypography.label, color: tripTabColors.labelIdle },
  labelActive: { ...tripTabTypography.labelActive, color: tripTabColors.labelActive },
  underline: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    height: tripTabMetrics.underlineHeight,
    backgroundColor: tripTabColors.underline,
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
  },
});
