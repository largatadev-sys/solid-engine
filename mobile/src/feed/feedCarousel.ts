export const MAX_DOTS = 5;

const EDGE_SCALE = 0.6;

const MIDDLE_SCALE = 0.85;


export function pageOfOffset(offset: number, pageWidth: number, pageCount: number): number {
  if (pageWidth <= 0 || pageCount <= 0) {
    return 0;
  }
  return clamp(Math.round(offset / pageWidth), 0, pageCount - 1);
}


export function landingPage(from: number, travel: number, pageWidth: number, pageCount: number): number {
  if (pageWidth <= 0 || pageCount <= 0) {
    return 0;
  }
  const pages = Math.round(Math.abs(travel) / pageWidth);
  const moved = travel < 0 ? -pages : pages;
  return clamp(from + moved, 0, pageCount - 1);
}


export function dotWindow(page: number, pageCount: number): number[] {
  if (pageCount <= MAX_DOTS) {
    return range(pageCount);
  }
  const half = Math.floor(MAX_DOTS / 2);
  const start = clamp(page - half, 0, pageCount - MAX_DOTS);
  return range(MAX_DOTS).map((offset) => start + offset);
}


export function dotScale(dot: number, page: number, window: number[], pageCount: number): number {
  if (dot === page) {
    return 1;
  }
  if (pageCount <= MAX_DOTS) {
    return MIDDLE_SCALE;
  }
  const atWindowEdge = dot === window[0] || dot === window[window.length - 1];
  const moreBeyond = dot === window[0] ? dot > 0 : dot < pageCount - 1;
  return atWindowEdge && moreBeyond ? EDGE_SCALE : MIDDLE_SCALE;
}


export function showsCarousel(photoCount: number): boolean {
  return photoCount > 1;
}


export function counterLabel(page: number, pageCount: number): string {
  return `${page + 1}/${pageCount}`;
}


export function loadsPage(candidate: number, page: number): boolean {
  return Math.abs(candidate - page) <= 1;
}


function range(count: number): number[] {
  return Array.from({ length: count }, (_unused, index) => index);
}


function clamp(value: number, lowest: number, highest: number): number {
  return Math.min(Math.max(value, lowest), highest);
}
