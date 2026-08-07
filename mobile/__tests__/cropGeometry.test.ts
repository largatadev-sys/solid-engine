import {
  clampOffset,
  clampZoom,
  coverScale,
  cropAreaOf,
  displayedSize,
  distanceBetween,
  MAX_ZOOM,
  MIN_ZOOM,
  zoomForPinch,
} from '../src/media/cropGeometry';

const FRAME = 300;

describe('coverScale — the photo always fills the circle', () => {
  it('scales a wide photo by its height, so no gap appears above or below', () => {
    expect(coverScale({ width: 1200, height: 400 }, FRAME)).toBe(FRAME / 400);
  });

  it('scales a tall photo by its width', () => {
    expect(coverScale({ width: 400, height: 1200 }, FRAME)).toBe(FRAME / 400);
  });

  it('leaves a square photo exactly filling the frame', () => {
    expect(coverScale({ width: 800, height: 800 }, FRAME)).toBe(FRAME / 800);
  });
});

describe('clampZoom', () => {
  it('never lets the photo shrink below covering the frame', () => {
    expect(clampZoom(0.2)).toBe(MIN_ZOOM);
  });

  it('caps zoom so the crop cannot become a pixellated speck', () => {
    expect(clampZoom(99)).toBe(MAX_ZOOM);
  });
});

describe('distanceBetween', () => {
  it('measures the straight line between two fingers', () => {
    expect(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

describe('zoomForPinch — spreading fingers zooms by their distance ratio', () => {
  it('doubles the zoom when the fingers spread twice as far apart', () => {
    expect(zoomForPinch(1.5, 100, 200)).toBe(3);
  });

  it('shrinks the zoom as the fingers come together', () => {
    expect(zoomForPinch(2, 200, 100)).toBe(1);
  });

  it('never zooms out past the frame-covering minimum', () => {
    expect(zoomForPinch(1, 300, 30)).toBe(MIN_ZOOM);
  });

  it('never zooms in past the maximum', () => {
    expect(zoomForPinch(3, 100, 900)).toBe(MAX_ZOOM);
  });

  it('holds still when the starting distance is zero, instead of dividing by it', () => {
    expect(zoomForPinch(2, 0, 150)).toBe(2);
  });
});

describe('clampOffset — dragging can never expose an empty edge', () => {
  it('allows sideways travel on a wide photo but stops at its edge', () => {
    const image = { width: 1200, height: 400 };
    const slack = (displayedSize(image, FRAME, 1).width - FRAME) / 2;

    expect(clampOffset({ x: 9999, y: 0 }, image, FRAME, 1).x).toBeCloseTo(slack);
    expect(clampOffset({ x: -9999, y: 0 }, image, FRAME, 1).x).toBeCloseTo(-slack);
  });

  it('pins a square photo at centre when unzoomed, because there is nothing to pan', () => {
    const image = { width: 800, height: 800 };

    expect(clampOffset({ x: 500, y: 500 }, image, FRAME, 1)).toEqual({ x: 0, y: 0 });
  });

  it('frees vertical travel once zoomed in', () => {
    const image = { width: 800, height: 800 };

    expect(clampOffset({ x: 0, y: 9999 }, image, FRAME, 2).y).toBeGreaterThan(0);
  });
});

describe('cropAreaOf — what the traveler framed is what gets cut', () => {
  it('takes the centre square of a wide photo when untouched', () => {
    const area = cropAreaOf({ width: 1200, height: 400 }, FRAME, 1, { x: 0, y: 0 });

    expect(area).toEqual({ x: 400, y: 0, width: 400, height: 400 });
  });

  it('is always square, so the circle never crops a surprise', () => {
    const area = cropAreaOf({ width: 1600, height: 900 }, FRAME, 1.7, { x: 40, y: -20 });

    expect(area.width).toBe(area.height);
  });

  it('moves the cut leftwards when the traveler drags the photo right', () => {
    const image = { width: 1200, height: 400 };
    const centred = cropAreaOf(image, FRAME, 1, { x: 0, y: 0 });
    const dragged = cropAreaOf(image, FRAME, 1, { x: 60, y: 0 });

    expect(dragged.x).toBeLessThan(centred.x);
  });

  it('takes a smaller region as the traveler zooms in', () => {
    const image = { width: 1200, height: 1200 };

    expect(cropAreaOf(image, FRAME, 2, { x: 0, y: 0 }).width).toBeLessThan(
      cropAreaOf(image, FRAME, 1, { x: 0, y: 0 }).width,
    );
  });

  it('never asks for pixels outside the source image', () => {
    const image = { width: 500, height: 500 };
    const area = cropAreaOf(image, FRAME, 1, { x: 9999, y: 9999 });

    expect(area.x).toBeGreaterThanOrEqual(0);
    expect(area.y).toBeGreaterThanOrEqual(0);
    expect(area.x + area.width).toBeLessThanOrEqual(image.width);
    expect(area.y + area.height).toBeLessThanOrEqual(image.height);
  });
});
