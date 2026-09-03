import { Fragment, useEffect, useRef } from 'react';
import { webStyle } from '../itineraries/webStyle';
import {
  afterTap,
  midpoint,
  nextWholeZoom,
  spanOf,
  wasATap,
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

  const down = useRef(new Map<number, SurfacePoint>());
  const from = useRef<SurfacePoint | null>(null);
  const pinch = useRef<{ span: number; zoom: number } | null>(null);
  const lastTapAt = useRef(0);

  useEffect(() => {
    const found = surfaceRef?.current as HTMLElement | null | undefined;
    if (found === null || found === undefined || typeof found.addEventListener !== 'function') return;
    const node: HTMLElement = found;

    const localTo = (event: { clientX: number; clientY: number }): SurfacePoint => {
      const box = node.getBoundingClientRect();
      return { x: event.clientX - box.left, y: event.clientY - box.top };
    };

    const twoDown = (): [SurfacePoint, SurfacePoint] | null => {
      const [first, second] = [...down.current.values()];
      return first === undefined || second === undefined ? null : [first, second];
    };

    const moving = (event: PointerEvent) => {
      if (!down.current.has(event.pointerId)) return;
      down.current.set(event.pointerId, localTo(event));

      const fingers = twoDown();
      if (fingers !== null) {
        const started = pinch.current;
        if (started === null) return;
        live.current.onZoomTo(
          zoomAfterPinch(started.zoom, started.span, spanOf(fingers[0], fingers[1])),
          midpoint(fingers[0], fingers[1]),
        );
        return;
      }

      const anchor = from.current;
      if (anchor === null) return;
      const here = localTo(event);
      live.current.onPan(here.x - anchor.x, here.y - anchor.y);
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
      down.current.delete(event.pointerId);

      if (down.current.size >= 1) {
        const [remaining] = [...down.current.values()];
        from.current = remaining ?? null;
        pinch.current = null;
        return;
      }

      const anchor = from.current;
      const pinched = pinch.current !== null;
      from.current = null;
      pinch.current = null;
      release();

      if (anchor === null || pinched) {
        live.current.onSettle(0, 0);
        return;
      }

      const here = localTo(event);
      const dx = here.x - anchor.x;
      const dy = here.y - anchor.y;

      if (wasATap(dx, dy)) {
        const tap = afterTap(lastTapAt.current, Date.now());
        lastTapAt.current = tap.lastTapAt;
        if (tap.zoomIn) live.current.onZoomTo(nextWholeZoom(live.current.zoom, 1), here);
        live.current.onSettle(0, 0);
        return;
      }

      live.current.onSettle(dx, dy);
    }

    const grab = (event: PointerEvent) => {
      down.current.set(event.pointerId, localTo(event));

      const fingers = twoDown();
      if (fingers !== null) {
        pinch.current = { span: spanOf(fingers[0], fingers[1]), zoom: live.current.zoom };
        return;
      }

      from.current = localTo(event);
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
      down.current.clear();
      pinch.current = null;
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
