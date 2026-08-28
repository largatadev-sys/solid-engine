import { useEffect, useRef } from 'react';
import { colors } from '../theme';
import type { Point } from './dockGeometry';


export type DockDrag = {
  readonly handlers: object;
  readonly discStyle: Record<string, unknown>;
  readonly tracksPointer: boolean;
};


export function useDockDrag({
  onGrab,
  onMove,
  onRelease,
  onNudge,
  threshold,
  dragging,
}: {
  readonly onGrab: () => void;
  readonly onMove: (offset: Point) => void;
  readonly onRelease: (offset: Point) => void;
  readonly onNudge: (key: string) => boolean;
  readonly threshold: number;
  readonly dragging: boolean;
}): DockDrag {
  const live = useRef({ onGrab, onMove, onRelease, onNudge, threshold });
  live.current = { onGrab, onMove, onRelease, onNudge, threshold };

  const from = useRef<Point | null>(null);
  const settle = useRef<(event: PointerEvent) => void>(() => {});

  settle.current = (event) => {
    const start = from.current;
    if (start === null) return;
    from.current = null;
    detach();
    live.current.onRelease({ x: event.clientX - start.x, y: event.clientY - start.y });
  };

  const forward = useRef((event: PointerEvent) => settle.current(event)).current;

  const detach = () => {
    if (typeof window === 'undefined') return;
    window.removeEventListener('pointerup', forward);
    window.removeEventListener('pointercancel', forward);
  };

  useEffect(() => detach, []);

  return {
    handlers: {
      onPointerDown: (event: { clientX: number; clientY: number }) => {
        from.current = { x: event.clientX, y: event.clientY };
        if (typeof window !== 'undefined') {
          window.addEventListener('pointerup', forward);
          window.addEventListener('pointercancel', forward);
        }
        live.current.onGrab();
      },
      onContextMenu: (event: { preventDefault: () => void }) => event.preventDefault(),
      onKeyDown: (event: { key?: string; preventDefault?: () => void }) => {
        if (live.current.onNudge(event.key ?? '')) event.preventDefault?.();
      },
    },
    discStyle: {
      touchAction: 'none',
      userSelect: 'none',
      WebkitTouchCallout: 'none',
      cursor: dragging ? 'grabbing' : 'grab',
      outlineColor: colors.accent,
      outlineOffset: 2,
    },
    tracksPointer: false,
  };
}
