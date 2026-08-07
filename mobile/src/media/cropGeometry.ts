export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Offset {
  readonly x: number;
  readonly y: number;
}

export interface CropArea {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;


export function coverScale(image: Size, frame: number): number {
  return Math.max(frame / image.width, frame / image.height);
}


export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}


export function distanceBetween(a: Offset, b: Offset): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}


export function downscaleTarget(image: Size, maxEdge: number): Size | null {
  const edge = Math.max(image.width, image.height);
  if (edge <= maxEdge) return null;
  const scale = maxEdge / edge;
  return { width: Math.round(image.width * scale), height: Math.round(image.height * scale) };
}


export function zoomForPinch(startZoom: number, startDistance: number, distance: number): number {
  if (startDistance <= 0) return clampZoom(startZoom);
  return clampZoom(startZoom * (distance / startDistance));
}


export function clampOffset(offset: Offset, image: Size, frame: number, zoom: number): Offset {
  const shown = displayedSize(image, frame, zoom);
  const slackX = Math.max(0, (shown.width - frame) / 2);
  const slackY = Math.max(0, (shown.height - frame) / 2);
  return {
    x: Math.min(slackX, Math.max(-slackX, offset.x)),
    y: Math.min(slackY, Math.max(-slackY, offset.y)),
  };
}


export function displayedSize(image: Size, frame: number, zoom: number): Size {
  const scale = coverScale(image, frame) * zoom;
  return { width: image.width * scale, height: image.height * scale };
}


export function cropAreaOf(image: Size, frame: number, zoom: number, offset: Offset): CropArea {
  const scale = coverScale(image, frame) * zoom;
  const shown = displayedSize(image, frame, zoom);

  const leftInShown = (shown.width - frame) / 2 - offset.x;
  const topInShown = (shown.height - frame) / 2 - offset.y;

  const edge = Math.round(frame / scale);
  const x = Math.round(leftInShown / scale);
  const y = Math.round(topInShown / scale);

  return {
    x: Math.min(Math.max(0, x), Math.max(0, image.width - edge)),
    y: Math.min(Math.max(0, y), Math.max(0, image.height - edge)),
    width: Math.min(edge, image.width),
    height: Math.min(edge, image.height),
  };
}
