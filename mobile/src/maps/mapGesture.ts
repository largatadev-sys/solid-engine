import type { StyleProp, ViewStyle } from 'react-native';


export const TAP_SLOP = 6;

export const DOUBLE_TAP_MS = 320;


export type MapGesture = {
  readonly handlers: object;
  readonly surfaceStyle: StyleProp<ViewStyle>;
};


export interface MapGestureProps {
  readonly onPan: (dx: number, dy: number) => void;
  readonly onSettle: (dx: number, dy: number) => void;
  readonly onZoom: (by: number) => void;
  readonly surfaceRef?: { current: unknown };
  readonly dragging: boolean;
}


export function wasATap(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) <= TAP_SLOP;
}


export function afterTap(
  previousTapAt: number,
  now: number,
): { readonly zoomIn: boolean; readonly lastTapAt: number } {
  const quick = now - previousTapAt <= DOUBLE_TAP_MS;

  return { zoomIn: quick, lastTapAt: quick ? 0 : now };
}
