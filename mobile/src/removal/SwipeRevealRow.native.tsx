import { useRef } from 'react';
import { Animated, PanResponder } from 'react-native';
import { SwipeStage, revealedFrom, type SwipeRowProps } from './swipeRowShell';
import { useSwipeTrack } from './swipeTrack.native';
import { engages, releaseOutcome, trackedX } from './swipeReveal';


export type { SwipeAction } from './swipeRowShell';


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
  const { x, at, grab, snapTo } = useSwipeTrack(open, peek);
  const base = useRef(0);
  const openRef = useRef(open);
  openRef.current = open;
  const settle = useRef(onOpen);
  settle.current = onOpen;
  const shut = useRef(onClose);
  shut.current = onClose;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => openRef.current,
      onMoveShouldSetPanResponder: (_event, gesture) => engages(gesture.dx, gesture.dy),
      onPanResponderGrant: () => {
        base.current = at.current;
        grab();
      },
      onPanResponderMove: (_event, gesture) => {
        x.setValue(trackedX(base.current, gesture.dx));
      },
      onPanResponderRelease: (_event, gesture) => {
        const outcome = releaseOutcome(base.current, gesture.dx, gesture.dy, openRef.current);
        snapTo(outcome.x);
        if (outcome.opens) settle.current();
        if (outcome.closes) shut.current();
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  return (
    <SwipeStage action={action} subjectTitle={subjectTitle} revealed={revealedFrom(x)} onAct={onAct}>
      <Animated.View style={{ transform: [{ translateX: x }] }} {...pan.panHandlers}>
        {children}
      </Animated.View>
    </SwipeStage>
  );
}
