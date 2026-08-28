import type { DockEdge, DockPosition } from './dockPosition';

export type DockBounds = {
  readonly width: number;
  readonly height: number;
  readonly insetTop: number;
  readonly insetBottom: number;
  readonly disc: number;
  readonly rail: number;
};

export type Point = {
  readonly x: number;
  readonly y: number;
};


export function verticalRange(bounds: DockBounds): { readonly top: number; readonly bottom: number } {
  const top = bounds.insetTop;
  const bottom = Math.max(top, bounds.height - bounds.insetBottom - bounds.disc);
  return { top, bottom };
}


export function clampY(y: number, bounds: DockBounds): number {
  const { top, bottom } = verticalRange(bounds);
  return Math.min(bottom, Math.max(top, y));
}


export function nearerEdge(centreX: number, bounds: DockBounds): DockEdge {
  return centreX < bounds.width / 2 ? 'left' : 'right';
}


export function edgeX(edge: DockEdge, bounds: DockBounds): number {
  return edge === 'left' ? bounds.rail : bounds.width - bounds.rail - bounds.disc;
}


export function fractionOf(y: number, bounds: DockBounds): number {
  const { top, bottom } = verticalRange(bounds);
  const span = bottom - top;
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (y - top) / span));
}


export function yOf(fraction: number, bounds: DockBounds): number {
  const { top, bottom } = verticalRange(bounds);
  return top + (bottom - top) * Math.min(1, Math.max(0, fraction));
}


export function landingFor(release: Point, bounds: DockBounds): DockPosition {
  const edge = nearerEdge(release.x + bounds.disc / 2, bounds);
  return { edge, y: fractionOf(clampY(release.y, bounds), bounds) };
}


export function defaultPosition(bounds: DockBounds, bottomReserve: number): DockPosition {
  const y = clampY(bounds.height - bounds.insetBottom - bottomReserve - bounds.disc, bounds);
  return { edge: 'right', y: fractionOf(y, bounds) };
}


export function travelled(from: Point, to: Point): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}


export function isDrag(from: Point, to: Point, threshold: number): boolean {
  return travelled(from, to) >= threshold;
}


export function opensOnRelease(
  travel: Point,
  heldMs: number,
  threshold: number,
  holdLimitMs: number,
): boolean {
  if (isDrag({ x: 0, y: 0 }, travel, threshold)) return false;
  return heldMs < holdLimitMs;
}


export function withOverdrag(x: number, bounds: DockBounds, overdrag: number): number {
  const left = bounds.rail - overdrag;
  const right = bounds.width - bounds.rail - bounds.disc + overdrag;
  return Math.min(right, Math.max(left, x));
}


export function dismissZoneCentre(bounds: DockBounds, bottomInset: number): Point {
  return { x: bounds.width / 2, y: bounds.height - bottomInset };
}


export function inDismissZone(
  discTopLeft: Point,
  bounds: DockBounds,
  zone: { readonly centre: Point; readonly radius: number },
): boolean {
  const centre = { x: discTopLeft.x + bounds.disc / 2, y: discTopLeft.y + bounds.disc / 2 };
  return Math.hypot(centre.x - zone.centre.x, centre.y - zone.centre.y) <= zone.radius;
}
