import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { workspaceColors, workspaceMetrics } from '../theme/workspaceTokens';
import { displacementFor, landingSlot, reorderActionsFor } from './landingSlot';
import type { ActivityResponse } from '../types/api';
import { ActivityRow } from './WorkspaceDayCard';
import type { WorkspaceAffordances } from './workspaceControls';


const SETTLE = { damping: 20, stiffness: 220, mass: 0.6 };

const LIFT_MS = 140;


interface DraggableActivityListProps {
  readonly activities: ActivityResponse[];
  readonly affordances: WorkspaceAffordances;
  readonly onEdit: (activity: ActivityResponse) => void;
  readonly onDelete: (activity: ActivityResponse) => void;
  readonly onDrop: (activityId: string, toIndex: number) => void;
  readonly onNudge: (activityId: string, direction: 'up' | 'down') => void;
}


export function DraggableActivityList({
  activities,
  affordances,
  onEdit,
  onDelete,
  onDrop,
  onNudge,
}: DraggableActivityListProps) {
  const draggingIndex = useSharedValue(-1);
  const dragTranslation = useSharedValue(0);
  const rowHeight = useSharedValue<number>(workspaceMetrics.activityRowHeight);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const measure = (event: LayoutChangeEvent) => {
    const measured = event.nativeEvent.layout.height;
    if (measured > 0) rowHeight.value = measured;
  };

  return (
    <View>
      {activities.map((activity, index) => (
        <DraggableRow
          key={activity.id}
          activity={activity}
          index={index}
          count={activities.length}
          affordances={affordances}
          draggingIndex={draggingIndex}
          dragTranslation={dragTranslation}
          rowHeight={rowHeight}
          isDragging={draggingId === activity.id}
          onMeasure={index === 0 ? measure : undefined}
          onDragStart={() => setDraggingId(activity.id)}
          onDragEnd={(toIndex) => {
            setDraggingId(null);
            if (toIndex !== index) onDrop(activity.id, toIndex);
          }}
          onEdit={onEdit}
          onDelete={onDelete}
          onNudge={onNudge}
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
  draggingIndex,
  dragTranslation,
  rowHeight,
  isDragging,
  onMeasure,
  onDragStart,
  onDragEnd,
  onEdit,
  onDelete,
  onNudge,
}: {
  activity: ActivityResponse;
  index: number;
  count: number;
  affordances: WorkspaceAffordances;
  draggingIndex: SharedValue<number>;
  dragTranslation: SharedValue<number>;
  rowHeight: SharedValue<number>;
  isDragging: boolean;
  onMeasure?: (event: LayoutChangeEvent) => void;
  onDragStart: () => void;
  onDragEnd: (toIndex: number) => void;
  onEdit: (activity: ActivityResponse) => void;
  onDelete: (activity: ActivityResponse) => void;
  onNudge: (activityId: string, direction: 'up' | 'down') => void;
}) {
  const lift = useSharedValue(0);

  const pan = Gesture.Pan()
    .activateAfterLongPress(200)
    .onStart(() => {
      draggingIndex.value = index;
      dragTranslation.value = 0;
      lift.value = withTiming(1, { duration: LIFT_MS });
      runOnJS(onDragStart)();
    })
    .onUpdate((event) => {
      dragTranslation.value = event.translationY;
    })
    .onEnd(() => {
      const target = landingSlot(dragTranslation.value, index, count, rowHeight.value);
      draggingIndex.value = -1;
      dragTranslation.value = 0;
      lift.value = withTiming(0, { duration: LIFT_MS });
      runOnJS(onDragEnd)(target);
    });

  const style = useAnimatedStyle(() => {
    const held = draggingIndex.value;

    if (held === index) {
      return {
        transform: [{ translateY: dragTranslation.value }, { scale: 1 + lift.value * 0.03 }],
        zIndex: 2,
        elevation: 4 * lift.value,
        opacity: 1 - lift.value * 0.06,
        shadowOpacity: lift.value * 0.18,
      };
    }

    if (held === -1) {
      return { transform: [{ translateY: withSpring(0, SETTLE) }, { scale: 1 }], zIndex: 0 };
    }

    const target = landingSlot(dragTranslation.value, held, count, rowHeight.value);
    const displaced = displacementFor(index, held, target, rowHeight.value);

    return {
      transform: [{ translateY: withSpring(displaced, SETTLE) }, { scale: 1 }],
      zIndex: 0,
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.row, style]} onLayout={onMeasure}>
        <ActivityRow
          activity={activity}
          affordances={affordances}
          onEdit={onEdit}
          onDelete={onDelete}
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
    backgroundColor: workspaceColors.surface,
    shadowColor: workspaceColors.title,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
});
