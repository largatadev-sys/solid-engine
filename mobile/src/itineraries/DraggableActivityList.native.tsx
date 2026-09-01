import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { workspaceColors, workspaceMetrics, workspaceRadii } from '../theme/workspaceTokens';
import {
  landingSlot,
  orderFromSlots,
  orderedBy,
  reassigned,
  reorderActionsFor,
  slotsFromIds,
} from './landingSlot';
import type { ActivityResponse } from '../types/api';
import { ActivityRow } from './WorkspaceDayCard';
import type { WorkspaceAffordances } from './workspaceControls';


const SETTLE = { damping: 26, stiffness: 320, mass: 0.5, overshootClamping: true };

const LONG_PRESS_MS = 120;

const LIFT_MS = 90;

const LIFT_SCALE = 0.03;

const LIFT_ELEVATION = 4;

const LIFT_FADE = 0.06;

const LIFT_SHADOW = 0.18;

const ROW_GAP = 8;

const ROW_ENTRY_MS = 180;

const ROW_STAGGER_MS = 40;


interface DraggableActivityListProps {
  readonly activities: ActivityResponse[];
  readonly affordances: WorkspaceAffordances;
  readonly onEdit: (activity: ActivityResponse) => void;
  readonly onDelete: (activity: ActivityResponse) => void;
  readonly onDrop: (activityId: string, toIndex: number) => void;
  readonly onNudge: (activityId: string, direction: 'up' | 'down') => void;
  readonly destination?: string | null;
}


export function DraggableActivityList({
  activities,
  affordances,
  onEdit,
  onDelete,
  onDrop,
  onNudge,
  destination = null,
}: DraggableActivityListProps) {
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  const [pitch, setPitch] = useState<number>(workspaceMetrics.activityRowHeight + ROW_GAP);

  const serverOrder = activities.map((a) => a.id).join();

  useEffect(() => {
    setLocalOrder(null);
  }, [serverOrder]);

  const rows = orderedBy(activities, localOrder);
  const idsKey = rows.map((a) => a.id).join();

  const slots = useSharedValue<Record<string, number>>(slotsFromIds(rows.map((a) => a.id)));
  const draggingId = useSharedValue<string | null>(null);
  const dragY = useSharedValue(0);
  const grabTop = useSharedValue(0);
  const rowPitch = useSharedValue<number>(pitch);

  useEffect(() => {
    slots.value = slotsFromIds(idsKey === '' ? [] : idsKey.split(','));
  }, [idsKey, slots]);

  const measure = (event: LayoutChangeEvent) => {
    const measured = event.nativeEvent.layout.height;
    if (measured > 0) {
      setPitch(measured + ROW_GAP);
      rowPitch.value = measured + ROW_GAP;
    }
  };

  const finishDrop = (activityId: string, order: string[]) => {
    if (order.join() === idsKey) return;
    setLocalOrder(order);
    onDrop(activityId, order.indexOf(activityId));
  };

  return (
    <View style={{ height: Math.max(0, rows.length * pitch - ROW_GAP) }}>
      {rows.map((activity, index) => (
        <DraggableRow
          key={activity.id}
          activity={activity}
          index={index}
          count={rows.length}
          affordances={affordances}
          slots={slots}
          draggingId={draggingId}
          dragY={dragY}
          grabTop={grabTop}
          rowPitch={rowPitch}
          onMeasure={index === 0 ? measure : undefined}
          onRelease={finishDrop}
          onEdit={onEdit}
          onDelete={onDelete}
          onNudge={onNudge}
          destination={destination}
        />
      ))}
    </View>
  );
}


function DraggableRow({
  activity,
  index,
  count,
  affordances,
  slots,
  draggingId,
  dragY,
  grabTop,
  rowPitch,
  onMeasure,
  onRelease,
  onEdit,
  onDelete,
  onNudge,
  destination,
}: {
  activity: ActivityResponse;
  index: number;
  count: number;
  affordances: WorkspaceAffordances;
  slots: SharedValue<Record<string, number>>;
  draggingId: SharedValue<string | null>;
  dragY: SharedValue<number>;
  grabTop: SharedValue<number>;
  rowPitch: SharedValue<number>;
  onMeasure?: (event: LayoutChangeEvent) => void;
  onRelease: (activityId: string, order: string[]) => void;
  onEdit: (activity: ActivityResponse) => void;
  onDelete: (activity: ActivityResponse) => void;
  onNudge: (activityId: string, direction: 'up' | 'down') => void;
  destination: string | null;
}) {
  const lift = useSharedValue(0);

  const pan = Gesture.Pan()
    .activateAfterLongPress(LONG_PRESS_MS)
    .onStart(() => {
      const slot = slots.value[activity.id] ?? index;
      grabTop.value = slot * rowPitch.value;
      dragY.value = grabTop.value;
      draggingId.value = activity.id;
      lift.value = withTiming(1, { duration: LIFT_MS });
    })
    .onUpdate((event) => {
      dragY.value = grabTop.value + event.translationY;
      const hovered = landingSlot(dragY.value, 0, count, rowPitch.value);
      if (hovered !== slots.value[activity.id]) {
        slots.value = reassigned(slots.value, activity.id, hovered);
      }
    })
    .onEnd(() => {
      const slot = slots.value[activity.id] ?? index;
      const order = orderFromSlots(slots.value);
      lift.value = withTiming(0, { duration: LIFT_MS });
      dragY.value = withSpring(slot * rowPitch.value, SETTLE, (finished) => {
        if (finished === true) {
          draggingId.value = null;
        }
      });
      runOnJS(onRelease)(activity.id, order);
    });

  const style = useAnimatedStyle(() => {
    const isHeld = draggingId.value === activity.id;
    const lifted = lift.value;
    const slot = slots.value[activity.id] ?? index;
    const restingTop = slot * rowPitch.value;

    const translateY = isHeld
      ? dragY.value
      : draggingId.value === null
        ? restingTop
        : withSpring(restingTop, SETTLE);

    return {
      transform: [{ translateY }, { scale: isHeld ? 1 + lifted * LIFT_SCALE : 1 }],
      zIndex: isHeld ? 2 : 0,
      elevation: isHeld ? lifted * LIFT_ELEVATION : 0,
      opacity: isHeld ? 1 - lifted * LIFT_FADE : 1,
      shadowOpacity: isHeld ? lifted * LIFT_SHADOW : 0,
      backgroundColor: isHeld && lifted > 0 ? workspaceColors.surface : workspaceColors.none,
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.row, style]}
        onLayout={onMeasure}
        entering={FadeIn.duration(ROW_ENTRY_MS).delay(index * ROW_STAGGER_MS)}
      >
        <ActivityRow
          activity={activity}
          affordances={affordances}
          onEdit={onEdit}
          onDelete={onDelete}
          destination={destination}
          accessibilityActions={reorderActionsFor(index, count)}
          onAccessibilityAction={(action) => {
            if (action === 'moveUp' || action === 'moveDown') {
              onNudge(activity.id, action === 'moveUp' ? 'up' : 'down');
            }
          }}
        />
      </Animated.View>
    </GestureDetector>
  );
}


const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    borderRadius: workspaceRadii.card,
    shadowColor: workspaceColors.title,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
});
