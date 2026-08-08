import { useState } from 'react';
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
import { displacementFor, landingSlot, reorderActionsFor } from './landingSlot';
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
  const settlingTarget = useSharedValue(-1);
  const rowPitch = useSharedValue<number>(workspaceMetrics.activityRowHeight);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const measure = (event: LayoutChangeEvent) => {
    const measured = event.nativeEvent.layout.height;
    if (measured > 0) rowPitch.value = measured + ROW_GAP;
  };

  return (
    <View style={styles.list}>
      {activities.map((activity, index) => (
        <DraggableRow
          key={activity.id}
          activity={activity}
          index={index}
          count={activities.length}
          affordances={affordances}
          draggingIndex={draggingIndex}
          dragTranslation={dragTranslation}
          settlingTarget={settlingTarget}
          rowPitch={rowPitch}
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
  settlingTarget,
  rowPitch,
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
  settlingTarget: SharedValue<number>;
  rowPitch: SharedValue<number>;
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
    .activateAfterLongPress(LONG_PRESS_MS)
    .onStart(() => {
      draggingIndex.value = index;
      settlingTarget.value = -1;
      dragTranslation.value = 0;
      lift.value = withTiming(1, { duration: LIFT_MS });
      runOnJS(onDragStart)();
    })
    .onUpdate((event) => {
      dragTranslation.value = event.translationY;
    })
    .onEnd(() => {
      const target = landingSlot(dragTranslation.value, index, count, rowPitch.value);
      settlingTarget.value = target;
      dragTranslation.value = withSpring((target - index) * rowPitch.value, SETTLE, (finished) => {
        if (finished === true) {
          draggingIndex.value = -1;
          settlingTarget.value = -1;
          dragTranslation.value = 0;
        }
      });
      lift.value = withTiming(0, { duration: LIFT_MS });
      runOnJS(onDragEnd)(target);
    });

  const style = useAnimatedStyle(() => {
    const held = draggingIndex.value;
    const lifted = lift.value;
    const isHeld = held === index;

    const settling = settlingTarget.value !== -1;

    const target = settling
      ? settlingTarget.value
      : landingSlot(dragTranslation.value, held, count, rowPitch.value);

    const translateY = isHeld
      ? dragTranslation.value
      : withSpring(
          held === -1 ? 0 : displacementFor(index, held, target, rowPitch.value),
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
  list: {
    gap: ROW_GAP,
  },
  row: {
    borderRadius: workspaceRadii.card,
    shadowColor: workspaceColors.title,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
});
