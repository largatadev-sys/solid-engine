import { useRef } from 'react';
import {
  PanResponder,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { spanBetween } from './tileProjection';


export type MapGesture = {
  readonly handlers: object;
  readonly surfaceStyle: StyleProp<ViewStyle>;
};


export function useMapGesture({
  onPan,
  onSettle,
  onZoom,
}: {
  readonly onPan: (dx: number, dy: number) => void;
  readonly onSettle: (dx: number, dy: number) => void;
  readonly onZoom: (by: number) => void;
  readonly dragging: boolean;
}): MapGesture {
  const live = useRef({ onPan, onSettle, onZoom });
  live.current = { onPan, onSettle, onZoom };

  const pinchFrom = useRef<number | null>(null);
  const zoomedBy = useRef(0);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pinchFrom.current = null;
        zoomedBy.current = 0;
      },
      onPanResponderMove: (event, gesture) => {
        const fingers = touchesOf(event);

        if (fingers === null) {
          if (pinchFrom.current === null) live.current.onPan(gesture.dx, gesture.dy);
          return;
        }

        const span = spanBetween(fingers[0], fingers[1]);
        if (pinchFrom.current === null) {
          pinchFrom.current = span;
          return;
        }

        const levels = Math.trunc(Math.log2(span / pinchFrom.current));
        if (levels !== zoomedBy.current) {
          live.current.onZoom(levels - zoomedBy.current);
          zoomedBy.current = levels;
        }
      },
      onPanResponderRelease: (_event, gesture) => {
        const pinched = pinchFrom.current !== null;
        pinchFrom.current = null;
        live.current.onSettle(pinched ? 0 : gesture.dx, pinched ? 0 : gesture.dy);
      },
      onPanResponderTerminate: () => {
        pinchFrom.current = null;
        live.current.onSettle(0, 0);
      },
    }),
  ).current;

  return { handlers: responder.panHandlers, surfaceStyle: {} };
}


function touchesOf(event: GestureResponderEvent): [{ x: number; y: number }, { x: number; y: number }] | null {
  const touches = event.nativeEvent.touches;
  if (touches === undefined || touches.length < 2) return null;

  return [
    { x: touches[0]?.pageX ?? 0, y: touches[0]?.pageY ?? 0 },
    { x: touches[1]?.pageX ?? 0, y: touches[1]?.pageY ?? 0 },
  ];
}
