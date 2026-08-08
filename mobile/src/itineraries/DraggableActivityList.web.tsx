import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { workspaceColors, workspaceMetrics, workspaceRadii } from '../theme/workspaceTokens';
import type { ActivityResponse } from '../types/api';
import { ActivityRow } from './WorkspaceDayCard';
import { displacementFor, landingSlot, movedTo, orderedBy, reorderActionsFor } from './landingSlot';
import type { WorkspaceAffordances } from './workspaceControls';
import { webStyle } from './webStyle';


const ROW_GAP = 8;

const DRAG_THRESHOLD = 4;

const SETTLE_MS = 160;

const HELD_CURSOR = webStyle({ cursor: 'grabbing', userSelect: 'none' });

const EASING = webStyle({
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
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  const pitch = useRef(workspaceMetrics.activityRowHeight + ROW_GAP);
  const origin = useRef(0);
  const translation = useRef(0);
  const moved = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const serverOrder = activities.map((a) => a.id).join();

  useEffect(() => {
    setLocalOrder(null);
  }, [serverOrder]);

  useEffect(() => {
    return () => {
      if (settleTimer.current !== null) clearTimeout(settleTimer.current);
    };
  }, []);

  const rows = orderedBy(activities, localOrder);

  const measure = (event: LayoutChangeEvent) => {
    const measured = event.nativeEvent.layout.height;
    if (measured > 0) pitch.current = measured + ROW_GAP;
  };

  const startDrag = (index: number, clientY: number) => {
    if (settleTimer.current !== null) clearTimeout(settleTimer.current);
    origin.current = clientY;
    translation.current = 0;
    moved.current = false;
    setDrag({ index, translation: 0 });
  };

  const moveDrag = (clientY: number) => {
    translation.current = clientY - origin.current;
    if (Math.abs(translation.current) > DRAG_THRESHOLD) moved.current = true;
    setDrag((current) =>
      current === null || current.settling === true
        ? current
        : { ...current, translation: translation.current },
    );
  };

  const endDrag = (index: number, activityId: string) => {
    if (!moved.current) {
      setDrag(null);
      return;
    }

    const target = landingSlot(translation.current, index, rows.length, pitch.current);
    const remainder = translation.current - (target - index) * pitch.current;

    if (target !== index) {
      setLocalOrder(movedTo(rows.map((a) => a.id), index, target));
      onDrop(activityId, target);
    }

    setDrag({ index: target, translation: remainder, settling: true });
    requestAnimationFrame(() => {
      setDrag((current) => (current?.settling === true ? { ...current, translation: 0 } : current));
    });
    settleTimer.current = setTimeout(() => {
      setDrag((current) => (current?.settling === true ? null : current));
    }, SETTLE_MS + 40);
  };

  return (
    <View style={styles.list}>
      {rows.map((activity, index) => (
        <DraggableRow
          key={activity.id}
          activity={activity}
          index={index}
          count={rows.length}
          affordances={affordances}
          drag={drag}
          pitch={pitch.current}
          onMeasure={index === 0 ? measure : undefined}
          onGrabStart={(clientY) => startDrag(index, clientY)}
          onGrabMove={moveDrag}
          onGrabEnd={() => endDrag(index, activity.id)}
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
    : drag === null || settling
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
      if (drag !== null && drag.settling !== true) onGrabMove(event.nativeEvent.clientY);
    },
    onPointerUp: () => onGrabEnd(),
    onPointerCancel: () => onGrabEnd(),
  };

  return (
    <View
      style={[
        styles.row,
        { transform: [{ translateY: offset }] },
        isHeld ? (settling ? EASING : HELD_CURSOR) : drag !== null && !settling ? EASING : null,
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
