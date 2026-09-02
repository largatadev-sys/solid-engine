import { useRef } from 'react';
import {
  PanResponder,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';


const TAP_SLOP = 6;

const DOUBLE_TAP_MS = 320;


export type MapGesture = {
  readonly handlers: object;
  readonly surfaceStyle: StyleProp<ViewStyle>;
};


export function useMapGesture({
  onPan,
  onSettle,
  onZoom,
  zoom,
}: {
  readonly onPan: (dx: number, dy: number) => void;
  readonly onSettle: (dx: number, dy: number) => void;
  readonly onZoom: (by: number) => void;
  readonly zoom: number;
  readonly surfaceRef?: { current: unknown };
  readonly dragging: boolean;
}): MapGesture {
  const live = useRef({ onPan, onSettle, onZoom, zoom });
  live.current = { onPan, onSettle, onZoom, zoom };

  const lastTap = useRef(0);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_event, gesture) => live.current.onPan(gesture.dx, gesture.dy),
      onPanResponderRelease: (_event, gesture) => {
        if (Math.hypot(gesture.dx, gesture.dy) <= TAP_SLOP) {
          const now = Date.now();
          const quick = now - lastTap.current <= DOUBLE_TAP_MS;
          lastTap.current = quick ? 0 : now;
          if (quick) live.current.onZoom(1);
          live.current.onSettle(0, 0);
          return;
        }

        live.current.onSettle(gesture.dx, gesture.dy);
      },
      onPanResponderTerminate: () => live.current.onSettle(0, 0),
    }),
  ).current;

  return { handlers: responder.panHandlers, surfaceStyle: {} };
}

