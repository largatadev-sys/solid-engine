import { useEffect, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { webStyle } from '../itineraries/webStyle';


const TAP_SLOP = 5;


export type MapGesture = {
  readonly handlers: object;
  readonly surfaceStyle: StyleProp<ViewStyle>;
};


export function useMapGesture({
  onPan,
  onSettle,
  onZoom,
  onTap,
  surfaceRef,
  dragging,
}: {
  readonly onPan: (dx: number, dy: number) => void;
  readonly onSettle: (dx: number, dy: number) => void;
  readonly onZoom: (by: number) => void;
  readonly onTap?: (x: number, y: number) => void;
  readonly surfaceRef?: { current: unknown };
  readonly dragging: boolean;
}): MapGesture {
  const live = useRef({ onPan, onSettle, onZoom, onTap });
  live.current = { onPan, onSettle, onZoom, onTap };

  const from = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const found = surfaceRef?.current as HTMLElement | null | undefined;
    if (found === null || found === undefined || typeof found.addEventListener !== 'function') return;
    const node: HTMLElement = found;

    const moving = (event: PointerEvent) => {
      const start = from.current;
      if (start === null) return;
      live.current.onPan(event.clientX - start.x, event.clientY - start.y);
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
      const start = from.current;
      if (start === null) return;

      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      from.current = null;
      release();

      if (Math.hypot(dx, dy) <= TAP_SLOP) {
        const box = node.getBoundingClientRect();
        live.current.onTap?.(event.clientX - box.left, event.clientY - box.top);
        live.current.onSettle(0, 0);
        return;
      }
      live.current.onSettle(dx, dy);
    }

    const grab = (event: PointerEvent) => {
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
