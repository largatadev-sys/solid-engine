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
  readonly destination?: string | null;
}


type DragState = { index: number; translation: number } | null;


export function settleWith(element: HTMLElement | undefined, remainder: number): void {
  if (element === undefined || typeof element.animate !== 'function') return;
  for (const running of element.getAnimations()) running.cancel();
  element.style.zIndex = '2';
  const settle = element.animate(
    [{ transform: `translateY(${remainder}px)` }, { transform: 'translateY(0px)' }],
    { duration: SETTLE_MS, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
  );
  settle.onfinish = () => {
    element.style.zIndex = '';
  };
  settle.oncancel = () => {
    element.style.zIndex = '';
  };
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
  const [drag, setDrag] = useState<DragState>(null);
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  const pitch = useRef(workspaceMetrics.activityRowHeight + ROW_GAP);
  const origin = useRef(0);
  const translation = useRef(0);
  const moved = useRef(false);
  const rowElements = useRef(new Map<string, HTMLElement>());

  const serverOrder = activities.map((a) => a.id).join();

  useEffect(() => {
    setLocalOrder(null);
  }, [serverOrder]);

  const rows = orderedBy(activities, localOrder);

  const measure = (event: LayoutChangeEvent) => {
    const measured = event.nativeEvent.layout.height;
    if (measured > 0) pitch.current = measured + ROW_GAP;
  };

  const startDrag = (index: number, clientY: number) => {
    origin.current = clientY;
    translation.current = 0;
    moved.current = false;
    setDrag({ index, translation: 0 });
  };

  const moveDrag = (clientY: number) => {
    translation.current = clientY - origin.current;
    if (Math.abs(translation.current) > DRAG_THRESHOLD) moved.current = true;
    setDrag((current) => (current === null ? null : { ...current, translation: translation.current }));
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

    setDrag(null);
    requestAnimationFrame(() => settleWith(rowElements.current.get(activityId), remainder));
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
          destination={destination}
          onElement={(element) => {
            if (element === null) rowElements.current.delete(activity.id);
            else rowElements.current.set(activity.id, element);
          }}
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
  destination,
  onElement,
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
  destination: string | null;
  onElement: (element: HTMLElement | null) => void;
}) {
  const isHeld = drag !== null && drag.index === index;
  const target = drag === null ? index : landingSlot(drag.translation, drag.index, count, pitch);
  const offset = isHeld
    ? drag.translation
    : drag === null
      ? 0
      : displacementFor(index, drag.index, target, pitch);

  const grabHandlers = {
    focusable: true,
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
    onKeyDown: (event: { nativeEvent: KeyboardEvent; preventDefault?: () => void }) => {
      const key = event.nativeEvent.key;
      if (key !== 'ArrowUp' && key !== 'ArrowDown') return;
      event.preventDefault?.();
      onNudge(activity.id, key === 'ArrowUp' ? 'up' : 'down');
    },
  };

  return (
    <View
      ref={(node) => onElement(node as unknown as HTMLElement | null)}
      style={[
        styles.row,
        { transform: [{ translateY: offset }] },
        isHeld ? HELD_CURSOR : drag !== null ? EASING : null,
        isHeld && styles.held,
      ]}
      onLayout={onMeasure}
    >
      <ActivityRow
        activity={activity}
        affordances={affordances}
        onEdit={onEdit}
        onDelete={onDelete}
        destination={destination}
        grabHandlers={affordances.showsDragHandles ? grabHandlers : undefined}
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
