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
import { workspaceColors, workspaceMetrics, workspaceRadii } from '../theme/workspaceTokens';
import { displacementFor, landingSlot, reorderActionsFor } from './landingSlot';
import type { ActivityResponse } from '../types/api';
import { ActivityRow } from './WorkspaceDayCard';
import type { WorkspaceAffordances } from './workspaceControls';


const SETTLE = { damping: 20, stiffness: 220, mass: 0.6 };

const LIFT_MS = 140;

const LIFT_SCALE = 0.03;

const LIFT_ELEVATION = 4;

const LIFT_FADE = 0.06;

const LIFT_SHADOW = 0.18;


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
    const lifted = lift.value;
    const isHeld = held === index;

    const translateY = isHeld
      ? dragTranslation.value
      : withSpring(
          held === -1
            ? 0
            : displacementFor(
                index,
                held,
                landingSlot(dragTranslation.value, held, count, rowHeight.value),
                rowHeight.value,
              ),
          SETTLE,
        );

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
    borderRadius: workspaceRadii.card,
    shadowColor: workspaceColors.title,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
});
