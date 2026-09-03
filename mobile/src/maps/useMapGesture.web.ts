import { Fragment, useEffect, useRef } from 'react';
import { webStyle } from '../itineraries/webStyle';
import {
  NO_GESTURE,
  pointerDown,
  pointerMove,
  pointerUp,
  type GestureState,
} from './gestureTracker';
import {
  afterTap,
  endsAsTap,
  nextWholeZoom,
  wheelZoomDelta,
  type MapGesture,
  type MapGestureProps,
  type SurfacePoint,
} from './mapGesture';
import { zoomAfterPinch } from './tileProjection';


export function useMapGesture({
  onPan,
  onSettle,
  onZoomTo,
  zoom,
  surfaceRef,
  dragging,
}: MapGestureProps): MapGesture {
  const live = useRef({ onPan, onSettle, onZoomTo, zoom });
  live.current = { onPan, onSettle, onZoomTo, zoom };

  const gesture = useRef<GestureState>(NO_GESTURE);
  const lastTapAt = useRef(0);

  useEffect(() => {
    const found = surfaceRef?.current as HTMLElement | null | undefined;
    if (found === null || found === undefined || typeof found.addEventListener !== 'function') return;
    const node: HTMLElement = found;

    const localTo = (event: { clientX: number; clientY: number }): SurfacePoint => {
      const box = node.getBoundingClientRect();
      return { x: event.clientX - box.left, y: event.clientY - box.top };
    };

    const moving = (event: PointerEvent) => {
      const moved = pointerMove(gesture.current, event.pointerId, localTo(event), live.current.zoom);
      gesture.current = moved.state;

      if (moved.pinch !== null) {
        const { span, from, at } = moved.pinch;
        const baseline = moved.state.baseline;
        if (baseline === null) return;
        live.current.onZoomTo(zoomAfterPinch(from, baseline.span, span), at);
        return;
      }

      if (moved.pan !== null) live.current.onPan(moved.pan.dx, moved.pan.dy);
    };

    const swallow = (event: Event) => event.preventDefault();

    function release(): void {
      window.removeEventListener('pointermove', moving);
      window.removeEventListener('pointerup', settle);
      window.removeEventListener('pointercancel', settle);
      window.removeEventListener('selectstart', swallow);
      document.body.style.userSelect = '';
    }

    function settle(event: PointerEvent): void {
      const here = localTo(event);
      const lifted = pointerUp(gesture.current, event.pointerId, here);
      gesture.current = lifted.state;

      if (!lifted.done) return;
      release();

      const travel = lifted.travel;
      if (travel === null) {
        live.current.onSettle(0, 0);
        return;
      }

      if (endsAsTap(lifted.pinched, travel.dx, travel.dy)) {
        const tap = afterTap(lastTapAt.current, Date.now());
        lastTapAt.current = tap.lastTapAt;
        if (tap.zoomIn) live.current.onZoomTo(nextWholeZoom(live.current.zoom, 1), here);
        live.current.onSettle(0, 0);
        return;
      }

      live.current.onSettle(lifted.pinched ? 0 : travel.dx, lifted.pinched ? 0 : travel.dy);
    }

    const grab = (event: PointerEvent) => {
      const wasTracking = gesture.current.tracking;
      gesture.current = pointerDown(
        gesture.current,
        event.pointerId,
        localTo(event),
        live.current.zoom,
        event.isPrimary,
      );

      if (wasTracking && !event.isPrimary) return;

      window.addEventListener('pointermove', moving);
      window.addEventListener('pointerup', settle);
      window.addEventListener('pointercancel', settle);
      window.addEventListener('selectstart', swallow);
      document.body.style.userSelect = 'none';
    };

    const wheeling = (event: WheelEvent) => {
      event.preventDefault();
      live.current.onZoomTo(
        live.current.zoom + wheelZoomDelta(event.deltaY, event.ctrlKey),
        localTo(event),
      );
    };

    const block = (event: Event) => event.preventDefault();

    node.addEventListener('pointerdown', grab);
    node.addEventListener('wheel', wheeling, { passive: false });
    node.addEventListener('contextmenu', block);
    node.addEventListener('dragstart', block);

    return () => {
      release();
      gesture.current = NO_GESTURE;
      node.removeEventListener('pointerdown', grab);
      node.removeEventListener('wheel', wheeling);
      node.removeEventListener('contextmenu', block);
      node.removeEventListener('dragstart', block);
    };
  }, [surfaceRef]);

  return {
    Wrap: Fragment,
    surfaceStyle: webStyle({
      touchAction: 'none',
      userSelect: 'none',
      cursor: dragging ? 'grabbing' : 'grab',
    }),
  };
}
