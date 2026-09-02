import { useRef } from 'react';
import { PanResponder } from 'react-native';
import { afterTap, wasATap, type MapGesture, type MapGestureProps } from './mapGesture';


export function useMapGesture({ onPan, onSettle, onZoom }: MapGestureProps): MapGesture {
  const live = useRef({ onPan, onSettle, onZoom });
  live.current = { onPan, onSettle, onZoom };

  const lastTapAt = useRef(0);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_event, gesture) => live.current.onPan(gesture.dx, gesture.dy),
      onPanResponderRelease: (_event, gesture) => {
        if (wasATap(gesture.dx, gesture.dy)) {
          const tap = afterTap(lastTapAt.current, Date.now());
          lastTapAt.current = tap.lastTapAt;
          if (tap.zoomIn) live.current.onZoom(1);
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
