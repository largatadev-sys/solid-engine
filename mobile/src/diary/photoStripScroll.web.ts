import type { GestureResponderEvent } from 'react-native';

export const SHOW_SCROLLBAR = false;


const DRAG_BUTTON = 0;

interface DragTarget {
  scrollLeft: number;
  setPointerCapture?: (pointerId: number) => void;
  releasePointerCapture?: (pointerId: number) => void;
}

interface DragEvent {
  button?: number;
  pointerId?: number;
  clientX?: number;
  currentTarget?: DragTarget;
  preventDefault?: () => void;
}


function scroller(node: unknown): DragTarget | null {
  const target = node as DragTarget | null;
  return target !== null && typeof target === 'object' && 'scrollLeft' in target ? target : null;
}


export function dragToScroll(): {
  onPointerDown: (event: GestureResponderEvent) => void;
  onPointerMove: (event: GestureResponderEvent) => void;
  onPointerUp: (event: GestureResponderEvent) => void;
  onPointerCancel: (event: GestureResponderEvent) => void;
} {
  let from: number | null = null;
  let startedAt = 0;

  const stop = (event: GestureResponderEvent) => {
    const native = event as unknown as DragEvent;
    const target = scroller(native.currentTarget);
    if (target !== null && native.pointerId !== undefined) {
      target.releasePointerCapture?.(native.pointerId);
    }
    from = null;
  };

  return {
    onPointerDown: (event: GestureResponderEvent) => {
      const native = event as unknown as DragEvent;
      if (native.button !== undefined && native.button !== DRAG_BUTTON) return;
      const target = scroller(native.currentTarget);
      if (target === null || native.clientX === undefined) return;

      from = native.clientX;
      startedAt = target.scrollLeft;
      if (native.pointerId !== undefined) target.setPointerCapture?.(native.pointerId);
    },

    onPointerMove: (event: GestureResponderEvent) => {
      const native = event as unknown as DragEvent;
      const target = scroller(native.currentTarget);
      if (from === null || target === null || native.clientX === undefined) return;

      native.preventDefault?.();
      target.scrollLeft = startedAt - (native.clientX - from);
    },

    onPointerUp: stop,
    onPointerCancel: stop,
  };
}
