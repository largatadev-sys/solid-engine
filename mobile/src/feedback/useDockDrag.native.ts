import { useRef } from 'react';
import { PanResponder } from 'react-native';
import type { Point } from './dockGeometry';


export type DockDrag = {
  readonly handlers: object;
  readonly discStyle: Record<string, unknown>;
  readonly tracksPointer: boolean;
};


export function useDockDrag({
  onGrab,
  onMove,
  onRelease,
  threshold,
}: {
  readonly onGrab: () => void;
  readonly onMove: (offset: Point) => void;
  readonly onRelease: (offset: Point) => void;
  readonly onNudge: (key: string) => boolean;
  readonly threshold: number;
  readonly dragging: boolean;
}): DockDrag {
  const live = useRef({ onGrab, onMove, onRelease, threshold });
  live.current = { onGrab, onMove, onRelease, threshold };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.hypot(gesture.dx, gesture.dy) >= live.current.threshold,
      onPanResponderGrant: () => live.current.onGrab(),
      onPanResponderMove: (_event, gesture) =>
        live.current.onMove({ x: gesture.dx, y: gesture.dy }),
      onPanResponderRelease: (_event, gesture) =>
        live.current.onRelease({ x: gesture.dx, y: gesture.dy }),
      onPanResponderTerminate: (_event, gesture) =>
        live.current.onRelease({ x: gesture.dx, y: gesture.dy }),
    }),
  ).current;

  return { handlers: responder.panHandlers, discStyle: {}, tracksPointer: true };
}
