import { useEffect, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { webStyle } from '../itineraries/webStyle';


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
  surfaceRef,
  dragging,
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

  const down = useRef(new Map<number, { x: number; y: number }>());
  const from = useRef<{ x: number; y: number } | null>(null);
  const lastTap = useRef(0);

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

      if (Math.hypot(dx, dy) <= TAP_SLOP) {
        const now = Date.now();
        const quick = now - lastTap.current <= DOUBLE_TAP_MS;
        lastTap.current = quick ? 0 : now;
        if (quick) live.current.onZoom(1);
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
