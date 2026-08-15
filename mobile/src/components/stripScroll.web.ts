import type { GestureResponderEvent } from 'react-native';
import { draggedFar, settledOffset, viewportPitch } from './stripSettle';

export const SHOW_SCROLLBAR = false;


export const PAGING = {} as const;


export const SNAP_STYLE = {
  scrollSnapType: 'x mandatory',
  overscrollBehaviorX: 'contain',
} as const;

export const SNAP_CHILD_STYLE = { scrollSnapAlign: 'start' } as const;


const DRAG_BUTTON = 0;
const MOUSE = 'mouse';

interface DragTarget {
  scrollLeft: number;
  clientWidth?: number;
  style?: { scrollBehavior: string; scrollSnapType: string };
  setPointerCapture?: (pointerId: number) => void;
  releasePointerCapture?: (pointerId: number) => void;
  addEventListener?: (
    type: string,
    listener: (event: { stopPropagation: () => void; preventDefault: () => void }) => void,
    options?: { capture?: boolean; once?: boolean },
  ) => void;
  removeEventListener?: (
    type: string,
    listener: (event: { stopPropagation: () => void; preventDefault: () => void }) => void,
    options?: { capture?: boolean },
  ) => void;
}

interface DragEvent {
  button?: number;
  pointerId?: number;
  pointerType?: string;
  clientX?: number;
  currentTarget?: DragTarget;
  preventDefault?: () => void;
}


function scroller(node: unknown): DragTarget | null {
  const target = node as DragTarget | null;
  return target !== null && typeof target === 'object' && 'scrollLeft' in target ? target : null;
}


function ours(event: DragEvent): boolean {
  return event.pointerType === undefined || event.pointerType === MOUSE;
}


function capture(target: DragTarget, pointerId: number | undefined): void {
  if (pointerId === undefined) return;
  try {
    target.setPointerCapture?.(pointerId);
  } catch {
    return;
  }
}


function release(target: DragTarget, pointerId: number | undefined): void {
  if (pointerId === undefined) return;
  try {
    target.releasePointerCapture?.(pointerId);
  } catch {
    return;
  }
}


function swallowNextClick(target: DragTarget): void {
  if (target.addEventListener === undefined) return;
  const eat = (event: { stopPropagation: () => void; preventDefault: () => void }) => {
    event.stopPropagation();
    event.preventDefault();
  };
  target.addEventListener('click', eat, { capture: true, once: true });
  setTimeout(() => target.removeEventListener?.('click', eat, { capture: true }), 0);
}


export function dragToScroll(pitchOf: (viewport: number) => number = viewportPitch): {
  onPointerDown: (event: GestureResponderEvent) => void;
  onPointerMove: (event: GestureResponderEvent) => void;
  onPointerUp: (event: GestureResponderEvent) => void;
  onPointerCancel: (event: GestureResponderEvent) => void;
} {
  let from: number | null = null;
  let startedAt = 0;
  let travelled = false;
  let restoreSnap = '';
  let restoreBehavior = '';

  const stop = (event: GestureResponderEvent) => {
    const native = event as unknown as DragEvent;
    if (!ours(native)) return;
    const target = scroller(native.currentTarget);
    if (target === null) {
      from = null;
      return;
    }
    release(target, native.pointerId);

    const dragged = from !== null;
    const moved = travelled;
    from = null;
    travelled = false;
    if (!dragged) return;

    if (moved) swallowNextClick(target);

    const pitch = pitchOf(target.clientWidth ?? 0);
    const settled = settledOffset(target.scrollLeft, pitch);

    if (target.style !== undefined) {
      target.style.scrollBehavior = settled === target.scrollLeft ? restoreBehavior : 'smooth';
    }
    if (settled !== target.scrollLeft) target.scrollLeft = settled;
    if (target.style !== undefined) target.style.scrollSnapType = restoreSnap;
  };

  return {
    onPointerDown: (event: GestureResponderEvent) => {
      const native = event as unknown as DragEvent;
      if (!ours(native)) return;
      if (native.button !== undefined && native.button !== DRAG_BUTTON) return;
      const target = scroller(native.currentTarget);
      if (target === null || native.clientX === undefined) return;

      from = native.clientX;
      startedAt = target.scrollLeft;
      travelled = false;
      if (target.style !== undefined) {
        restoreSnap = target.style.scrollSnapType;
        restoreBehavior = target.style.scrollBehavior;
        target.style.scrollBehavior = 'auto';
        target.style.scrollSnapType = 'none';
      }
    },

    onPointerMove: (event: GestureResponderEvent) => {
      const native = event as unknown as DragEvent;
      if (!ours(native)) return;
      const target = scroller(native.currentTarget);
      if (from === null || target === null || native.clientX === undefined) return;

      if (!travelled && draggedFar(from, native.clientX)) {
        travelled = true;
        capture(target, native.pointerId);
      }

      native.preventDefault?.();
      target.scrollLeft = startedAt - (native.clientX - from);
    },

    onPointerUp: stop,
    onPointerCancel: stop,
  };
}
