import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from '../components/useReducedMotion';
import { removalMotion } from '../theme/removalTokens';
import { SwipeStage, type SwipeRowProps } from './swipeRowShell';
import { OPEN_X, engages, restingX, trackedX } from './swipeReveal';


export type { SwipeAction } from './swipeRowShell';


const SNAP_STYLE = {
  transitionProperty: 'transform',
  transitionDuration: `${removalMotion.snapMs}ms`,
  transitionTimingFunction: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
} as const;


export function SwipeRevealRow({
  action,
  subjectTitle,
  open,
  peek,
  onOpen,
  onClose,
  onAct,
  children,
}: SwipeRowProps) {
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const reducedMotion = useReducedMotion();
  const from = useRef<{ x: number; y: number } | null>(null);
  const base = useRef(0);
  const engaged = useRef(false);
  const hinted = useRef(false);

  useEffect(() => {
    if (!open) setX((held) => (held === OPEN_X ? 0 : held));
  }, [open]);

  useEffect(() => {
    if (!peek || reducedMotion || hinted.current) {
      return;
    }
    hinted.current = true;
    const out = setTimeout(() => {
      if (from.current === null) setX(removalMotion.peekPx);
    }, removalMotion.peekOutAtMs);
    const back = setTimeout(() => {
      if (from.current === null) setX(0);
    }, removalMotion.peekBackAtMs);

    return () => {
      clearTimeout(out);
      clearTimeout(back);
    };
  }, [peek, reducedMotion]);

  const release = (dx: number) => {
    const wasEngaged = engaged.current;
    from.current = null;
    engaged.current = false;
    setDragging(false);
    if (!wasEngaged) {
      return;
    }
    const landing = restingX(trackedX(base.current, dx));
    setX(landing);
    if (landing === OPEN_X) onOpen();
    else if (open) onClose();
  };

  const handlers: Record<string, unknown> = {
    onPointerDown: (event: { nativeEvent: PointerEvent }) => {
      const native = event.nativeEvent;
      from.current = { x: native.clientX, y: native.clientY };
      base.current = x;
      engaged.current = false;
    },
    onPointerMove: (event: { nativeEvent: PointerEvent }) => {
      const start = from.current;
      if (start === null) return;
      const native = event.nativeEvent;
      const dx = native.clientX - start.x;
      const dy = native.clientY - start.y;

      if (!engaged.current) {
        if (!engages(dx, dy)) return;
        engaged.current = true;
        setDragging(true);
        (native.target as Element | null)?.setPointerCapture?.(native.pointerId);
      }
      native.preventDefault();
      setX(trackedX(base.current, dx));
    },
    onPointerUp: (event: { nativeEvent: PointerEvent }) => {
      const start = from.current;
      release(start === null ? 0 : event.nativeEvent.clientX - start.x);
    },
    onPointerCancel: () => release(0),
  };

  return (
    <SwipeStage action={action} subjectTitle={subjectTitle} onAct={onAct}>
      <View
        style={StyleSheet.flatten([
          { transform: [{ translateX: x }] },
          dragging || reducedMotion ? null : SNAP_STYLE,
        ])}
        {...handlers}
      >
        {children}
      </View>
    </SwipeStage>
  );
}
