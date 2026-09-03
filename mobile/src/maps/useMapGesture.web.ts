import { useEffect, useRef } from 'react';
import { webStyle } from '../itineraries/webStyle';
import { afterTap, wasATap, type MapGesture, type MapGestureProps } from './mapGesture';


export function useMapGesture({
  onPan,
  onSettle,
  onZoom,
  surfaceRef,
  dragging,
}: MapGestureProps): MapGesture {
  const live = useRef({ onPan, onSettle, onZoom });
  live.current = { onPan, onSettle, onZoom };

  const down = useRef(new Map<number, { x: number; y: number }>());
  const from = useRef<{ x: number; y: number } | null>(null);
  const lastTapAt = useRef(0);

  useEffect(() => {
    const found = surfaceRef?.current as HTMLElement | null | undefined;
    if (found === null || found === undefined || typeof found.addEventListener !== 'function') return;
    const node: HTMLElement = found;

    const moving = (event: PointerEvent) => {
      if (!down.current.has(event.pointerId)) return;
      down.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      const anchor = from.current;
      if (anchor === null) return;
      live.current.onPan(event.clientX - anchor.x, event.clientY - anchor.y);
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
        return;
      }

      const anchor = from.current;
      from.current = null;
      release();

      if (anchor === null) {
        live.current.onSettle(0, 0);
        return;
      }

      const dx = event.clientX - anchor.x;
      const dy = event.clientY - anchor.y;

      if (wasATap(dx, dy)) {
        const tap = afterTap(lastTapAt.current, Date.now());
        lastTapAt.current = tap.lastTapAt;
        if (tap.zoomIn) live.current.onZoom(1);
        live.current.onSettle(0, 0);
        return;
      }

      live.current.onSettle(dx, dy);
    }

    const grab = (event: PointerEvent) => {
      down.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (down.current.size >= 2) return;

      from.current = { x: event.clientX, y: event.clientY };
      window.addEventListener('pointermove', moving);
      window.addEventListener('pointerup', settle);
      window.addEventListener('pointercancel', settle);
      window.addEventListener('selectstart', swallow);
      document.body.style.userSelect = 'none';
    };

    const wheeling = (event: WheelEvent) => {
      event.preventDefault();
      live.current.onZoom(event.deltaY < 0 ? 1 : -1);
    };

    const block = (event: Event) => event.preventDefault();

    node.addEventListener('pointerdown', grab);
    node.addEventListener('wheel', wheeling, { passive: false });
    node.addEventListener('contextmenu', block);
    node.addEventListener('dragstart', block);

    return () => {
      release();
      down.current.clear();
      node.removeEventListener('pointerdown', grab);
      node.removeEventListener('wheel', wheeling);
      node.removeEventListener('contextmenu', block);
      node.removeEventListener('dragstart', block);
    };
  }, [surfaceRef]);

  return {
    handlers: {},
    surfaceStyle: webStyle({
      touchAction: 'none',
      userSelect: 'none',
      cursor: dragging ? 'grabbing' : 'grab',
    }),
  };
}
