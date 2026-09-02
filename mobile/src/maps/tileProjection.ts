export const TILE_SIZE = 256;

export const MIN_ZOOM = 2;

export const MAX_ZOOM = 19;

const MERCATOR_LATITUDE_LIMIT = 85.0511287798066;


export interface LatLng {
  readonly lat: number;
  readonly lng: number;
}


export interface WorldPoint {
  readonly x: number;
  readonly y: number;
}


export interface TilePlacement {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly left: number;
  readonly top: number;
}


export interface Viewport {
  readonly centre: LatLng;
  readonly zoom: number;
  readonly width: number;
  readonly height: number;
}


export function worldSize(zoom: number): number {
  return TILE_SIZE * 2 ** zoom;
}


export function clampLatitude(lat: number): number {
  return Math.max(-MERCATOR_LATITUDE_LIMIT, Math.min(MERCATOR_LATITUDE_LIMIT, lat));
}


export function normalizeLongitude(lng: number): number {
  if (lng === 180 || lng === -180) return lng;
  const wrapped = ((lng + 180) % 360 + 360) % 360 - 180;
  return wrapped === -180 ? 180 : wrapped;
}


export function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(zoom)));
}


export function latLngToWorld(point: LatLng, zoom: number): WorldPoint {
  const size = worldSize(zoom);
  const lat = clampLatitude(point.lat);
  const lng = normalizeLongitude(point.lng);

  const sin = Math.sin((lat * Math.PI) / 180);
  const unclamped = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size;

  return {
    x: ((lng + 180) / 360) * size,
    y: Math.max(0, Math.min(size, unclamped)),
  };
}


export function worldToLatLng(point: WorldPoint, zoom: number): LatLng {
  const size = worldSize(zoom);

  const lng = (point.x / size) * 360 - 180;
  const n = Math.PI * (1 - 2 * (point.y / size));

  return {
    lat: (180 / Math.PI) * Math.atan(Math.sinh(n)),
    lng: normalizeLongitude(lng),
  };
}


export function tilesCovering(viewport: Viewport): TilePlacement[] {
  const { centre, zoom, width, height } = viewport;
  if (width <= 0 || height <= 0) return [];

  const span = 2 ** zoom;
  const origin = latLngToWorld(centre, zoom);

  const leftEdge = origin.x - width / 2;
  const topEdge = origin.y - height / 2;

  const firstColumn = Math.floor(leftEdge / TILE_SIZE);
  const lastColumn = Math.floor((leftEdge + width) / TILE_SIZE);
  const firstRow = Math.max(0, Math.floor(topEdge / TILE_SIZE));
  const lastRow = Math.min(span - 1, Math.floor((topEdge + height) / TILE_SIZE));

  const placements: TilePlacement[] = [];

  for (let column = firstColumn; column <= lastColumn; column += 1) {
    for (let row = firstRow; row <= lastRow; row += 1) {
      placements.push({
        x: ((column % span) + span) % span,
        y: row,
        z: zoom,
        left: column * TILE_SIZE - leftEdge,
        top: row * TILE_SIZE - topEdge,
      });
    }
  }

  return placements;
}


export function panned(centre: LatLng, zoom: number, dx: number, dy: number): LatLng {
  const origin = latLngToWorld(centre, zoom);
  const size = worldSize(zoom);

  return worldToLatLng(
    { x: origin.x - dx, y: Math.max(0, Math.min(size, origin.y - dy)) },
    zoom,
  );
}


export function screenOffsetOf(point: LatLng, viewport: Viewport): WorldPoint {
  const origin = latLngToWorld(viewport.centre, viewport.zoom);
  const target = latLngToWorld(point, viewport.zoom);
  const size = worldSize(viewport.zoom);

  let dx = target.x - origin.x;
  if (dx > size / 2) dx -= size;
  if (dx < -size / 2) dx += size;

  return { x: viewport.width / 2 + dx, y: viewport.height / 2 + (target.y - origin.y) };
}


export function pointAtScreen(offset: WorldPoint, viewport: Viewport): LatLng {
  const origin = latLngToWorld(viewport.centre, viewport.zoom);

  return worldToLatLng(
    {
      x: origin.x + (offset.x - viewport.width / 2),
      y: origin.y + (offset.y - viewport.height / 2),
    },
    viewport.zoom,
  );
}


export function zoomAfterPinch(startZoom: number, startSpan: number, span: number): number {
  if (startSpan <= 0 || span <= 0) return clampZoom(startZoom);

  return clampZoom(startZoom + Math.log2(span / startSpan));
}


export function spanBetween(a: WorldPoint, b: WorldPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
