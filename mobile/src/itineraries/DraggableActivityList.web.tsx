import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { workspaceColors, workspaceMetrics, workspaceRadii } from '../theme/workspaceTokens';
import type { ActivityResponse } from '../types/api';
import { ActivityRow } from './WorkspaceDayCard';
import { displacementFor, landingSlot, reorderActionsFor } from './landingSlot';
import { webStyle } from './webStyle';
import type { WorkspaceAffordances } from './workspaceControls';


const ROW_GAP = 8;

const DRAG_THRESHOLD = 4;

const SETTLE_MS = 160;

const HELD_CURSOR = webStyle({ cursor: 'grabbing', userSelect: 'none' });

const SETTLING = webStyle({
  transitionProperty: 'transform',
  transitionDuration: `${SETTLE_MS}ms`,
});


interface DraggableActivityListProps {
  readonly activities: ActivityResponse[];
  readonly affordances: WorkspaceAffordances;
  readonly onEdit: (activity: ActivityResponse) => void;
  readonly onDelete: (activity: ActivityResponse) => void;
  readonly onDrop: (activityId: string, toIndex: number) => void;
  readonly onNudge: (activityId: string, direction: 'up' | 'down') => void;
}


type DragState = { index: number; translation: number; settling?: boolean } | null;


export function DraggableActivityList({
  activities,
  affordances,
  onEdit,
  onDelete,
  onDrop,
  onNudge,
}: DraggableActivityListProps) {
  const [drag, setDrag] = useState<DragState>(null);
  const pitch = useRef(workspaceMetrics.activityRowHeight + ROW_GAP);
  const origin = useRef(0);
  const moved = useRef(false);
  const order = activities.map((a) => a.id).join();

  useEffect(() => {
    setDrag((current) => (current?.settling === true ? null : current));
  }, [order]);

  const measure = (event: LayoutChangeEvent) => {
    const measured = event.nativeEvent.layout.height;
    if (measured > 0) pitch.current = measured + ROW_GAP;
  };

  const startDrag = (index: number, clientY: number) => {
    origin.current = clientY;
    moved.current = false;
    setDrag({ index, translation: 0 });
  };

  const moveDrag = (clientY: number) => {
    setDrag((current) => {
      if (current === null) return null;
      const translation = clientY - origin.current;
      if (Math.abs(translation) > DRAG_THRESHOLD) moved.current = true;
      return { ...current, translation };
    });
  };

  const endDrag = () => {
    setDrag((current) => {
      if (current === null) return null;
      if (!moved.current) return null;

      const target = landingSlot(current.translation, current.index, activities.length, pitch.current);
      const activity = activities[current.index];
      if (activity !== undefined && target !== current.index) onDrop(activity.id, target);

      return { ...current, translation: (target - current.index) * pitch.current, settling: true };
    });
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
          drag={drag}
          pitch={pitch.current}
          onMeasure={index === 0 ? measure : undefined}
          onGrabStart={(clientY) => startDrag(index, clientY)}
          onGrabMove={moveDrag}
          onGrabEnd={endDrag}
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
  drag,
  pitch,
  onMeasure,
  onGrabStart,
  onGrabMove,
  onGrabEnd,
  onEdit,
  onDelete,
  onNudge,
}: {
  activity: ActivityResponse;
  index: number;
  count: number;
  affordances: WorkspaceAffordances;
  drag: DragState;
  pitch: number;
  onMeasure?: (event: LayoutChangeEvent) => void;
  onGrabStart: (clientY: number) => void;
  onGrabMove: (clientY: number) => void;
  onGrabEnd: () => void;
  onEdit: (activity: ActivityResponse) => void;
  onDelete: (activity: ActivityResponse) => void;
  onNudge: (activityId: string, direction: 'up' | 'down') => void;
}) {
  const isHeld = drag !== null && drag.index === index;
  const settling = drag?.settling === true;
  const target = drag === null ? index : landingSlot(drag.translation, drag.index, count, pitch);
  const offset = isHeld
    ? drag.translation
    : drag === null
      ? 0
      : displacementFor(index, drag.index, target, pitch);

  const grabHandlers = {
    onPointerDown: (event: { nativeEvent: PointerEvent }) => {
      const native = event.nativeEvent;
      native.preventDefault();
      (native.target as Element | null)?.setPointerCapture?.(native.pointerId);
      onGrabStart(native.clientY);
    },
    onPointerMove: (event: { nativeEvent: PointerEvent }) => {
      if (drag !== null) onGrabMove(event.nativeEvent.clientY);
    },
    onPointerUp: () => onGrabEnd(),
    onPointerCancel: () => onGrabEnd(),
  };

  return (
    <View
      style={[
        styles.row,
        { transform: [{ translateY: offset }] },
        isHeld && !settling ? HELD_CURSOR : SETTLING,
        isHeld && styles.held,
      ]}
      onLayout={onMeasure}
    >
      <ActivityRow
        activity={activity}
        affordances={affordances}
        onEdit={onEdit}
        onDelete={onDelete}
        grabHandlers={affordances.showsDragHandles ? grabHandlers : undefined}
        nudge={{
          canMoveUp: index > 0,
          canMoveDown: index < count - 1,
          onMoveUp: () => onNudge(activity.id, 'up'),
          onMoveDown: () => onNudge(activity.id, 'down'),
        }}
        accessibilityActions={reorderActionsFor(index, count)}
        onAccessibilityAction={(action) => {
          if (action === 'moveUp' || action === 'moveDown') {
            onNudge(activity.id, action === 'moveUp' ? 'up' : 'down');
          }
        }}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  list: {
    gap: ROW_GAP,
  },
  row: {
    borderRadius: workspaceRadii.card,
  },
  held: {
    zIndex: 2,
    backgroundColor: workspaceColors.surface,
    shadowColor: workspaceColors.title,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0.18,
  },
});
