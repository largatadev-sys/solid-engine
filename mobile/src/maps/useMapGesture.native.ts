import { createElement, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  afterTap,
  nextWholeZoom,
  wasATap,
  type MapGesture,
  type MapGestureProps,
} from './mapGesture';
import { zoomAfterPinch } from './tileProjection';


export function useMapGesture({ onPan, onSettle, onZoomTo, zoom }: MapGestureProps): MapGesture {
  const live = useRef({ onPan, onSettle, onZoomTo, zoom });
  live.current = { onPan, onSettle, onZoomTo, zoom };

  const lastTapAt = useRef(0);
  const pinchedFrom = useRef(zoom);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .minPointers(1)
      .maxPointers(1)
      .onChange((event) => live.current.onPan(event.translationX, event.translationY))
      .onEnd((event) => {
        if (wasATap(event.translationX, event.translationY)) {
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
      })
      .onChange((event) => {
        live.current.onZoomTo(zoomAfterPinch(pinchedFrom.current, 1, event.scale), {
          x: event.focalX,
          y: event.focalY,
        });
      })
      .onEnd(() => live.current.onSettle(0, 0));

    return Gesture.Simultaneous(pan, pinch);
  }, []);

  const Wrap = useMemo(
    () => ({ children }: { children?: ReactNode }) =>
      createElement(GestureDetector, { gesture }, children),
    [gesture],
  );

  return { Wrap, surfaceStyle: {} };
}

