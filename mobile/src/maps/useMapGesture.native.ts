import { createElement, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  afterTap,
  nextWholeZoom,
  endsAsTap,
  type MapGesture,
  type MapGestureProps,
} from './mapGesture';
import { zoomByScale } from './tileProjection';


export function useMapGesture({ onPan, onSettle, onZoomTo, zoom }: MapGestureProps): MapGesture {
  const live = useRef({ onPan, onSettle, onZoomTo, zoom });
  live.current = { onPan, onSettle, onZoomTo, zoom };

  const lastTapAt = useRef(0);
  const pinchedFrom = useRef(zoom);
  const everPinched = useRef(false);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .minPointers(1)
      .maxPointers(1)
      .onChange((event) => live.current.onPan(event.translationX, event.translationY))
      .onEnd((event) => {
        if (endsAsTap(everPinched.current, event.translationX, event.translationY)) {
          const tap = afterTap(lastTapAt.current, Date.now());
          lastTapAt.current = tap.lastTapAt;
          if (tap.zoomIn) {
            live.current.onZoomTo(nextWholeZoom(live.current.zoom, 1), { x: event.x, y: event.y });
          }
          live.current.onSettle(0, 0);
          return;
        }

        live.current.onSettle(event.translationX, event.translationY);
      })
      .onFinalize((_event, success) => {
        if (!success) live.current.onSettle(0, 0);
      });

    const pinch = Gesture.Pinch()
      .onBegin(() => {
        pinchedFrom.current = live.current.zoom;
        everPinched.current = true;
      })
      .onChange((event) => {
        live.current.onZoomTo(zoomByScale(pinchedFrom.current, event.scale), {
          x: event.focalX,
          y: event.focalY,
        });
      })
      .onEnd(() => live.current.onSettle(0, 0))
      .onFinalize(() => {
        everPinched.current = false;
      });

    return Gesture.Simultaneous(pan, pinch);
  }, []);

  const Wrap = useMemo(
    () => ({ children }: { children?: ReactNode }) =>
      createElement(GestureDetector, { gesture }, children),
    [gesture],
  );

  return { Wrap, surfaceStyle: {} };
}

