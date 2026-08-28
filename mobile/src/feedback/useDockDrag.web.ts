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
  onActivate,
  threshold,
  dragging,
}: {
  readonly onGrab: () => void;
  readonly onMove: (offset: Point) => void;
  readonly onRelease: (offset: Point) => void;
  readonly onNudge: (key: string) => boolean;
  readonly onActivate: () => void;
  readonly threshold: number;
  readonly dragging: boolean;
}): DockDrag {
  const live = useRef({ onGrab, onMove, onRelease, onNudge, onActivate, threshold });
  live.current = { onGrab, onMove, onRelease, onNudge, onActivate, threshold };

  const from = useRef<Point | null>(null);
  const track = useRef<(event: PointerEvent) => void>(() => {});
  const settle = useRef<(event: PointerEvent) => void>(() => {});

  track.current = (event) => {
    const start = from.current;
    if (start === null) return;
    live.current.onMove({ x: event.clientX - start.x, y: event.clientY - start.y });
  };

  settle.current = (event) => {
    const start = from.current;
    if (start === null) return;
    from.current = null;
    detach();
    live.current.onRelease({ x: event.clientX - start.x, y: event.clientY - start.y });
  };

  const moving = useRef((event: PointerEvent) => track.current(event)).current;
  const forward = useRef((event: PointerEvent) => settle.current(event)).current;
  const swallow = useRef((event: Event) => event.preventDefault()).current;

  const detach = () => {
    if (typeof window === 'undefined') return;
    window.removeEventListener('pointermove', moving);
    window.removeEventListener('pointerup', forward);
    window.removeEventListener('pointercancel', forward);
    window.removeEventListener('selectstart', swallow);
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
  };

  useEffect(() => detach, []);

  return {
    handlers: {
      onPointerDown: (event: { clientX: number; clientY: number }) => {
        from.current = { x: event.clientX, y: event.clientY };
        if (typeof window !== 'undefined') {
          window.addEventListener('pointermove', moving);
          window.addEventListener('pointerup', forward);
          window.addEventListener('pointercancel', forward);
          window.addEventListener('selectstart', swallow);
          document.body.style.userSelect = 'none';
          document.body.style.webkitUserSelect = 'none';
        }
        live.current.onGrab();
      },
      onContextMenu: (event: { preventDefault: () => void }) => event.preventDefault(),
      onKeyDown: (event: { key?: string; preventDefault?: () => void }) => {
        const key = event.key ?? '';
        if (key === 'Enter' || key === ' ') {
          event.preventDefault?.();
          live.current.onActivate();
          return;
        }
        if (live.current.onNudge(key)) event.preventDefault?.();
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
    tracksPointer: true,
  };
}
