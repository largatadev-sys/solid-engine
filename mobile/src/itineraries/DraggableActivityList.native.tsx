import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { workspaceMetrics } from '../theme/workspaceTokens';
import type { ActivityResponse } from '../types/api';
import { ActivityRow } from './WorkspaceDayCard';
import type { WorkspaceAffordances } from './workspaceControls';


const ROW_HEIGHT = workspaceMetrics.activityRowHeight;


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
  const [draggingId, setDraggingId] = useState<string | null>(null);

  return (
    <View>
      {activities.map((activity, index) => (
        <DraggableRow
          key={activity.id}
          activity={activity}
          index={index}
          count={activities.length}
          affordances={affordances}
          dragging={draggingId === activity.id}
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
  dragging,
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
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: (toIndex: number) => void;
  onEdit: (activity: ActivityResponse) => void;
  onDelete: (activity: ActivityResponse) => void;
  onNudge: (activityId: string, direction: 'up' | 'down') => void;
}) {
  const offsetY = useSharedValue(0);

  const pan = Gesture.Pan()
    .activateAfterLongPress(200)
    .onStart(() => {
      runOnJS(onDragStart)();
    })
    .onUpdate((event) => {
      offsetY.value = event.translationY;
    })
    .onEnd(() => {
      const slots = Math.round(offsetY.value / ROW_HEIGHT);
      const target = Math.max(0, Math.min(index + slots, count - 1));
      offsetY.value = 0;
      runOnJS(onDragEnd)(target);
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: offsetY.value }],
    zIndex: offsetY.value === 0 ? 0 : 1,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[style, dragging && styles.lifted]}>
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


export function reorderActionsFor(
  index: number,
  count: number,
): Array<{ name: 'moveUp' | 'moveDown'; label: string }> {
  const actions: Array<{ name: 'moveUp' | 'moveDown'; label: string }> = [];
  if (index > 0) actions.push({ name: 'moveUp', label: 'Move up' });
  if (index < count - 1) actions.push({ name: 'moveDown', label: 'Move down' });
  return actions;
}


const styles = StyleSheet.create({
  lifted: {
    opacity: 0.9,
    elevation: 4,
  },
});
