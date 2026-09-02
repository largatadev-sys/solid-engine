import { useEffect, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { webStyle } from '../itineraries/webStyle';


export type MapGesture = {
  readonly handlers: object;
  readonly surfaceStyle: StyleProp<ViewStyle>;
};


export function useMapGesture({
  onPan,
  onSettle,
  onZoom,
  dragging,
}: {
  readonly onPan: (dx: number, dy: number) => void;
  readonly onSettle: (dx: number, dy: number) => void;
  readonly onZoom: (by: number) => void;
  readonly dragging: boolean;
}): MapGesture {
  const live = useRef({ onPan, onSettle, onZoom });
  live.current = { onPan, onSettle, onZoom };

  const from = useRef<{ x: number; y: number } | null>(null);

  const moving = useRef((event: PointerEvent) => {
    const start = from.current;
    if (start === null) return;
    live.current.onPan(event.clientX - start.x, event.clientY - start.y);
  }).current;

  const forward = useRef((event: PointerEvent) => {
    const start = from.current;
    if (start === null) return;
    from.current = null;
    detach();
    live.current.onSettle(event.clientX - start.x, event.clientY - start.y);
  }).current;

  const swallow = useRef((event: Event) => event.preventDefault()).current;

  const wheeling = useRef((event: WheelEvent) => {
    event.preventDefault();
    live.current.onZoom(event.deltaY < 0 ? 1 : -1);
  }).current;

  const detach = () => {
    if (typeof window === 'undefined') return;
    window.removeEventListener('pointermove', moving);
    window.removeEventListener('pointerup', forward);
    window.removeEventListener('pointercancel', forward);
    window.removeEventListener('selectstart', swallow);
    document.body.style.userSelect = '';
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
        }
      },
      onWheel: wheeling,
      onContextMenu: (event: { preventDefault: () => void }) => event.preventDefault(),
    },
    surfaceStyle: webStyle({
      touchAction: 'none',
      userSelect: 'none',
      cursor: dragging ? 'grabbing' : 'grab',
    }),
  };
}
