export const MIN_DRAG_PX = 4;


export function viewportPitch(viewport: number): number {
  return viewport;
}


export function freeScroll(): number {
  return 0;
}


export function settledOffset(scrollLeft: number, pitch: number): number {
  if (pitch <= 0) {
    return scrollLeft;
  }
  return Math.round(scrollLeft / pitch) * pitch;
}


export function draggedFar(from: number, to: number): boolean {
  return Math.abs(to - from) >= MIN_DRAG_PX;
}
