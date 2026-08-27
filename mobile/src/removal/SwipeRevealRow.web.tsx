import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from '../components/useReducedMotion';
import { removalMotion } from '../theme/removalTokens';
import { SwipeStage, type SwipeRowProps } from './swipeRowShell';
import { OPEN_X, engages, releaseOutcome, trackedX } from './swipeReveal';


export type { SwipeAction } from './swipeRowShell';


const SNAP_STYLE = {
  transitionProperty: 'transform',
  transitionDuration: `${removalMotion.snapMs}ms`,
  transitionTimingFunction: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
} as const;


const CLICK_GRACE_MS = 400;


const GESTURE_STYLE = {
  touchAction: 'pan-y',
  userSelect: 'none',
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
  const [x, setX] = useState(() => (open ? OPEN_X : 0));
  const [dragging, setDragging] = useState(false);
  const reducedMotion = useReducedMotion();
  const gesturing = useRef(false);
  const base = useRef(0);
  const engaged = useRef(false);
  const hinted = useRef(false);

  useEffect(() => {
    if (gesturing.current) {
      return;
    }
    setX(open ? OPEN_X : 0);
  }, [open]);

  useEffect(() => {
    if (!peek || reducedMotion || hinted.current) {
      return;
    }
    hinted.current = true;
    const untouched = () => !gesturing.current && !engaged.current && !settle.current.open;
    const out = setTimeout(() => {
      if (untouched()) setX(removalMotion.peekPx);
    }, removalMotion.peekOutAtMs);
    const back = setTimeout(() => {
      if (untouched()) setX(0);
    }, removalMotion.peekBackAtMs);

    return () => {
      clearTimeout(out);
      clearTimeout(back);
    };
  }, [peek, reducedMotion]);

  const settle = useRef({ onOpen, onClose, open });
  settle.current = { onOpen, onClose, open };

  const track = useRef<((moved: PointerEvent) => void) | null>(null);
  const finish = useRef<((lifted: PointerEvent) => void) | null>(null);

  const refuseDrag = useRef((event: Event) => event.preventDefault()).current;

  const swallowNextClick = () => {
    const eat = (click: Event) => {
      click.preventDefault();
      click.stopPropagation();
    };
    window.addEventListener('click', eat, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', eat, true), CLICK_GRACE_MS);
  };

  const detach = () => {
    if (track.current !== null) window.removeEventListener('pointermove', track.current);
    if (finish.current !== null) {
      window.removeEventListener('pointerup', finish.current);
      window.removeEventListener('pointercancel', finish.current);
    }
    window.removeEventListener('dragstart', refuseDrag, true);
    track.current = null;
    finish.current = null;
  };

  const handlers: Record<string, unknown> = {
    draggable: false,
    onDragStart: (event: { preventDefault?: () => void }) => event.preventDefault?.(),
    onPointerDown: (event: { nativeEvent: PointerEvent }) => {
      const native = event.nativeEvent;
      if (!native.isPrimary) return;
      const start = { x: native.clientX, y: native.clientY };
      gesturing.current = true;
      base.current = x;
      engaged.current = false;
      detach();

      track.current = (moved: PointerEvent) => {
        const dx = moved.clientX - start.x;
        const dy = moved.clientY - start.y;
        if (!engaged.current) {
          if (!engages(dx, dy)) return;
          engaged.current = true;
          setDragging(true);
        }
        moved.preventDefault();
        setX(trackedX(base.current, dx));
      };

      finish.current = (lifted: PointerEvent) => {
        const dx = lifted.clientX - start.x;
        const dy = lifted.clientY - start.y;
        detach();
        gesturing.current = false;
        engaged.current = false;
        setDragging(false);

        const outcome = releaseOutcome(base.current, dx, dy, settle.current.open);
        setX(outcome.x);
        if (outcome.opens) settle.current.onOpen();
        if (outcome.closes) settle.current.onClose();
        if (outcome.opens || outcome.closes) swallowNextClick();
      };

      window.addEventListener('pointermove', track.current);
      window.addEventListener('pointerup', finish.current);
      window.addEventListener('pointercancel', finish.current);
      window.addEventListener('dragstart', refuseDrag, true);
    },
  };

  useEffect(() => detach, []);

  return (
    <SwipeStage action={action} subjectTitle={subjectTitle} revealed={x !== 0} onAct={onAct}>
      <View
        style={StyleSheet.flatten([
          GESTURE_STYLE,
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
