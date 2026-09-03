import type { ComponentType, ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';


export const TAP_SLOP = 6;

export const DOUBLE_TAP_MS = 320;

export const WHEEL_ZOOM_PER_PIXEL = 0.002;

export const TRACKPAD_PINCH_PER_PIXEL = 0.01;


export type MapGesture = {
  readonly Wrap: ComponentType<{ children?: ReactNode }>;
  readonly surfaceStyle: StyleProp<ViewStyle>;
};


export interface SurfacePoint {
  readonly x: number;
  readonly y: number;
}


export interface MapGestureProps {
  readonly onPan: (dx: number, dy: number) => void;
  readonly onSettle: (dx: number, dy: number) => void;
  readonly onZoomTo: (zoom: number, anchor: SurfacePoint) => void;
  readonly zoom: number;
  readonly surfaceRef?: { current: unknown };
  readonly dragging: boolean;
}


export const MIN_PINCH_SPAN = 24;


export function wasATap(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) <= TAP_SLOP;
}


export function endsAsTap(everPinched: boolean, dx: number, dy: number): boolean {
  return !everPinched && wasATap(dx, dy);
}


export function pinchBaseline(
  span: number,
  zoom: number,
): { readonly span: number; readonly zoom: number } | null {
  return span >= MIN_PINCH_SPAN ? { span, zoom } : null;
}


export function afterTap(
  previousTapAt: number,
  now: number,
): { readonly zoomIn: boolean; readonly lastTapAt: number } {
  const quick = now - previousTapAt <= DOUBLE_TAP_MS;

  return { zoomIn: quick, lastTapAt: quick ? 0 : now };
}


export function wheelZoomDelta(deltaY: number, trackpadPinch: boolean): number {
  return -deltaY * (trackpadPinch ? TRACKPAD_PINCH_PER_PIXEL : WHEEL_ZOOM_PER_PIXEL);
}


export function midpoint(a: SurfacePoint, b: SurfacePoint): SurfacePoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}


export function spanOf(a: SurfacePoint, b: SurfacePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}


export function nextWholeZoom(zoom: number, by: number): number {
  return by > 0 ? Math.floor(zoom) + by : Math.ceil(zoom) + by;
}
