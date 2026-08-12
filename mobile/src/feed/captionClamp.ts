export interface CaptionHeights {
  readonly full: number;
  readonly clamped: number;
}

export const UNMEASURED: CaptionHeights = { full: 0, clamped: 0 };

const SUBPIXEL_SLACK = 1;


export function captionOverflows(heights: CaptionHeights): boolean {
  if (heights.full <= 0 || heights.clamped <= 0) {
    return false;
  }
  return heights.full - heights.clamped > SUBPIXEL_SLACK;
}
