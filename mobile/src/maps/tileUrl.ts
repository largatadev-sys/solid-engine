import type { TilePlacement } from './tileProjection';


export interface MapConfig {
  readonly tileUrl: string;
  readonly attribution: string;
  readonly attributionUrl: string;
}


export function tileHref(template: string, tile: TilePlacement): string {
  return template
    .replace('{z}', String(tile.z))
    .replace('{x}', String(tile.x))
    .replace('{y}', String(tile.y));
}


export function tileKey(tile: TilePlacement): string {
  return `${tile.z}/${tile.x}/${tile.y}`;
}
