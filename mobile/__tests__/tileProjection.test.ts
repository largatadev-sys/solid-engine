import {
  MAX_ZOOM,
  MIN_ZOOM,
  TILE_SIZE,
  clampLatitude,
  storedZoom,
  latLngToWorld,
  liveZoom,
  normalizeLongitude,
  pointAtScreen,
  tilesCovering,
  worldToLatLng,
  worldSize,
  zoomAfterPinch,
  zoomedAt,
  spanBetween,
} from '../src/maps/tileProjection';


describe('Web Mercator: lat/lng to world pixels', () => {
  it('puts the origin of the projection at the top-left of the world', () => {
    const { x, y } = latLngToWorld({ lat: 85.0511287798066, lng: -180 }, 0);

    expect(x).toBeCloseTo(0, 5);
    expect(y).toBeCloseTo(0, 5);
  });

  it('puts null island at the centre of the world', () => {
    const { x, y } = latLngToWorld({ lat: 0, lng: 0 }, 0);

    expect(x).toBeCloseTo(TILE_SIZE / 2, 5);
    expect(y).toBeCloseTo(TILE_SIZE / 2, 5);
  });

  it('doubles the world with every zoom level', () => {
    expect(worldSize(0)).toBe(TILE_SIZE);
    expect(worldSize(1)).toBe(TILE_SIZE * 2);
    expect(worldSize(10)).toBe(TILE_SIZE * 1024);
  });

  it.each([
    ['El Nido', { lat: 11.1949, lng: 119.4013 }],
    ['Manila', { lat: 14.5995, lng: 120.9842 }],
    ['null island', { lat: 0, lng: 0 }],
    ['the far south-west', { lat: -33.8688, lng: -151.2093 }],
  ])('round-trips %s through world pixels without drift', (_name, point) => {
    for (const zoom of [1, 8, 14, 19]) {
      const back = worldToLatLng(latLngToWorld(point, zoom), zoom);

      expect(back.lat).toBeCloseTo(point.lat, 6);
      expect(back.lng).toBeCloseTo(point.lng, 6);
    }
  });

  it('places a more northerly point higher on the world than a southerly one', () => {
    const north = latLngToWorld({ lat: 20, lng: 0 }, 10);
    const south = latLngToWorld({ lat: -20, lng: 0 }, 10);

    expect(north.y).toBeLessThan(south.y);
  });

  it('places a more easterly point further right than a westerly one', () => {
    const east = latLngToWorld({ lat: 0, lng: 40 }, 10);
    const west = latLngToWorld({ lat: 0, lng: -40 }, 10);

    expect(east.x).toBeGreaterThan(west.x);
  });
});


describe('the poles are outside the projection and are clamped, never NaN', () => {
  it.each([
    ['the north pole', 90],
    ['the south pole', -90],
    ['beyond the north pole', 120],
    ['beyond the south pole', -120],
  ])('%s yields a finite world coordinate', (_name, lat) => {
    const { y } = latLngToWorld({ lat, lng: 0 }, 4);

    expect(Number.isFinite(y)).toBe(true);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(worldSize(4));
  });

  it('clamps latitude to the Mercator limit', () => {
    expect(clampLatitude(90)).toBeCloseTo(85.0511287798066, 9);
    expect(clampLatitude(-90)).toBeCloseTo(-85.0511287798066, 9);
    expect(clampLatitude(11.1949)).toBe(11.1949);
  });
});


describe('the antimeridian wraps rather than running off the world', () => {
  it.each([
    [181, -179],
    [-181, 179],
    [540, 180],
    [-180, -180],
    [180, 180],
    [0, 0],
  ])('normalizes %p to %p', (given, expected) => {
    expect(normalizeLongitude(given)).toBeCloseTo(expected, 9);
  });

  it('keeps a point just east of the antimeridian adjacent to one just west', () => {
    const east = latLngToWorld({ lat: 0, lng: 179.99 }, 8);
    const west = latLngToWorld({ lat: 0, lng: -179.99 }, 8);

    expect(east.x).toBeGreaterThan(worldSize(8) * 0.999);
    expect(west.x).toBeLessThan(worldSize(8) * 0.001);
  });
});


describe('zoom is bounded by what the tile provider serves', () => {
  it.each([
    [MIN_ZOOM - 3, MIN_ZOOM],
    [MAX_ZOOM + 5, MAX_ZOOM],
    [12, 12],
  ])('clamps %p to %p', (given, expected) => {
    expect(storedZoom(given)).toBe(expected);
  });

  it('rounds a fractional zoom rather than serving a tile level that does not exist', () => {
    expect(Number.isInteger(storedZoom(12.4))).toBe(true);
  });
});


describe('which tiles cover a viewport', () => {
  const centre = { lat: 11.1949, lng: 119.4013 };

  it('covers a viewport exactly one tile wide with the tiles that touch it', () => {
    const tiles = tilesCovering({ centre, zoom: 10, width: TILE_SIZE, height: TILE_SIZE });

    expect(tiles.length).toBeGreaterThanOrEqual(4);
    expect(tiles.length).toBeLessThanOrEqual(9);
  });

  it('covers a larger viewport with more tiles', () => {
    const small = tilesCovering({ centre, zoom: 10, width: 256, height: 256 });
    const large = tilesCovering({ centre, zoom: 10, width: 1024, height: 1024 });

    expect(large.length).toBeGreaterThan(small.length);
  });

  it('gives every tile a screen position and an integer tile address', () => {
    const tiles = tilesCovering({ centre, zoom: 12, width: 400, height: 700 });

    for (const tile of tiles) {
      expect(Number.isInteger(tile.x)).toBe(true);
      expect(Number.isInteger(tile.y)).toBe(true);
      expect(tile.z).toBe(12);
      expect(Number.isFinite(tile.left)).toBe(true);
      expect(Number.isFinite(tile.top)).toBe(true);
    }
  });

  it('never asks for a tile outside the world at that zoom', () => {
    for (const zoom of [0, 1, 2, 6]) {
      const tiles = tilesCovering({
        centre: { lat: 85, lng: 179 },
        zoom,
        width: 1200,
        height: 1200,
      });
      const span = 2 ** zoom;

      for (const tile of tiles) {
        expect(tile.y).toBeGreaterThanOrEqual(0);
        expect(tile.y).toBeLessThan(span);
        expect(tile.x).toBeGreaterThanOrEqual(0);
        expect(tile.x).toBeLessThan(span);
      }
    }
  });

  it('wraps tile columns across the antimeridian instead of leaving a gap', () => {
    const tiles = tilesCovering({
      centre: { lat: 0, lng: 180 },
      zoom: 3,
      width: 1024,
      height: 400,
    });
    const columns = new Set(tiles.map((tile) => tile.x));

    expect(columns.has(0)).toBe(true);
    expect(columns.has(2 ** 3 - 1)).toBe(true);
  });

  it('gives each tile a distinct screen slot', () => {
    const tiles = tilesCovering({ centre, zoom: 9, width: 800, height: 600 });
    const slots = new Set(tiles.map((tile) => `${tile.left},${tile.top}`));

    expect(slots.size).toBe(tiles.length);
  });

  it('has no tiles to draw for an unmeasured viewport', () => {
    expect(tilesCovering({ centre, zoom: 10, width: 0, height: 0 })).toEqual([]);
  });
});


describe('panning moves the same number of tiles in both directions (S4.17)', () => {
  const centre = { lat: 11.1949, lng: 119.4013 };
  const zoom = 12;

  it.each([
    ['half a tile', TILE_SIZE / 2],
    ['exactly one tile', TILE_SIZE],
    ['two and a half tiles', TILE_SIZE * 2.5],
  ])('shifts symmetrically for %s', (_name, distance) => {
    const origin = latLngToWorld(centre, zoom);

    const east = worldToLatLng({ x: origin.x + distance, y: origin.y }, zoom);
    const west = worldToLatLng({ x: origin.x - distance, y: origin.y }, zoom);

    expect(east.lng - centre.lng).toBeCloseTo(centre.lng - west.lng, 9);
  });

  it('shifts symmetrically north and south about the equator', () => {
    const equator = latLngToWorld({ lat: 0, lng: 0 }, zoom);

    const north = worldToLatLng({ x: equator.x, y: equator.y - TILE_SIZE / 2 }, zoom);
    const south = worldToLatLng({ x: equator.x, y: equator.y + TILE_SIZE / 2 }, zoom);

    expect(north.lat).toBeCloseTo(-south.lat, 9);
  });
});


describe('pinching changes zoom by the ratio of the fingers’ span', () => {
  it('gains a level when the fingers travel twice as far apart', () => {
    expect(zoomAfterPinch(12, 100, 200)).toBe(13);
  });

  it('loses a level when the span halves', () => {
    expect(zoomAfterPinch(12, 200, 100)).toBe(11);
  });

  it('stays put when the span does not change', () => {
    expect(zoomAfterPinch(12, 150, 150)).toBe(12);
  });

  it('is symmetric: doubling then halving returns to the start', () => {
    expect(zoomAfterPinch(zoomAfterPinch(12, 100, 200), 200, 100)).toBe(12);
  });

  it('never leaves the provider’s range however hard the pinch', () => {
    expect(zoomAfterPinch(18, 1, 100000)).toBe(MAX_ZOOM);
    expect(zoomAfterPinch(3, 100000, 1)).toBe(MIN_ZOOM);
  });

  it.each([
    ['a zero starting span', 0, 100],
    ['a zero current span', 100, 0],
    ['both zero', 0, 0],
  ])('holds the zoom for %s rather than yielding NaN', (_name, startSpan, span) => {
    const zoom = zoomAfterPinch(12, startSpan, span);

    expect(Number.isInteger(zoom)).toBe(true);
    expect(zoom).toBe(12);
  });

  it('measures the span between two fingers', () => {
    expect(spanBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(spanBetween({ x: 10, y: 10 }, { x: 10, y: 10 })).toBe(0);
  });
});


describe('zoom is CONTINUOUS while a gesture runs, and whole only when stored (PL-2, founder pass 2)', () => {
  it('keeps the fraction a pinch or a wheel produced', () => {
    expect(liveZoom(14.37)).toBeCloseTo(14.37, 5);
  });

  it('still refuses to leave the provider’s range', () => {
    expect(liveZoom(MAX_ZOOM + 3)).toBe(MAX_ZOOM);
    expect(liveZoom(MIN_ZOOM - 3)).toBe(MIN_ZOOM);
  });

  it('rounds only on the way to storage, because the column is a SMALLINT', () => {
    expect(storedZoom(14.37)).toBe(14);
    expect(storedZoom(14.63)).toBe(15);
  });

  it('a pinch reports the fraction it actually spanned — the rounding was the whole bug', () => {
    expect(zoomAfterPinch(14, 100, 150)).toBeCloseTo(14 + Math.log2(1.5), 5);
    expect(zoomAfterPinch(14, 100, 141.4)).toBeCloseTo(14.5, 2);
  });

  it('a pinch that spreads to double the span is exactly one zoom level', () => {
    expect(zoomAfterPinch(12, 80, 160)).toBeCloseTo(13, 5);
    expect(zoomAfterPinch(12, 160, 80)).toBeCloseTo(11, 5);
  });

  it('refuses a degenerate span rather than returning NaN or Infinity', () => {
    expect(zoomAfterPinch(14, 0, 100)).toBe(14);
    expect(zoomAfterPinch(14, 100, 0)).toBe(14);
  });
});


describe('zooming keeps the point under the fingers still (PL-2, founder pass 2)', () => {
  const viewport = { centre: { lat: 11.1949, lng: 119.4013 }, zoom: 14, width: 400, height: 600 };

  it('holds the anchored coordinate at the same screen offset across a zoom', () => {
    const offset = { x: 120, y: 200 };
    const under = pointAtScreen(offset, viewport);

    const moved = { ...viewport, zoom: 16, centre: zoomedAt(offset, viewport, 16) };
    const stillUnder = pointAtScreen(offset, moved);

    expect(stillUnder.lat).toBeCloseTo(under.lat, 6);
    expect(stillUnder.lng).toBeCloseTo(under.lng, 6);
  });

  it('holds it zooming OUT as well as in', () => {
    const offset = { x: 340, y: 80 };
    const under = pointAtScreen(offset, viewport);

    const moved = { ...viewport, zoom: 11.5, centre: zoomedAt(offset, viewport, 11.5) };

    expect(pointAtScreen(offset, moved).lat).toBeCloseTo(under.lat, 6);
    expect(pointAtScreen(offset, moved).lng).toBeCloseTo(under.lng, 6);
  });

  it('anchoring on the centre is the same as not anchoring at all', () => {
    const centreOffset = { x: viewport.width / 2, y: viewport.height / 2 };

    const moved = zoomedAt(centreOffset, viewport, 16);

    expect(moved.lat).toBeCloseTo(viewport.centre.lat, 6);
    expect(moved.lng).toBeCloseTo(viewport.centre.lng, 6);
  });

  it('a zoom that does not change the level does not move the map', () => {
    const moved = zoomedAt({ x: 10, y: 590 }, viewport, viewport.zoom);

    expect(moved.lat).toBeCloseTo(viewport.centre.lat, 9);
    expect(moved.lng).toBeCloseTo(viewport.centre.lng, 9);
  });

  it('never pushes the centre past the pole, however hard the corner is pinched', () => {
    const nearThePole = { ...viewport, centre: { lat: 84, lng: 0 }, zoom: 4 };

    const moved = zoomedAt({ x: 200, y: 0 }, nearThePole, 2);

    expect(Number.isFinite(moved.lat)).toBe(true);
    expect(Math.abs(moved.lat)).toBeLessThanOrEqual(90);
  });
});


describe('a fractional zoom still tiles the viewport (PL-2, founder pass 2)', () => {
  const at = (zoom: number) =>
    tilesCovering({ centre: { lat: 11.1949, lng: 119.4013 }, zoom, width: 400, height: 600 });

  it('asks the provider for a WHOLE tile zoom — there is no z=14.4 tile', () => {
    expect(at(14.4).every((tile) => Number.isInteger(tile.z))).toBe(true);
    expect(at(14.4).map((tile) => tile.z)).toContain(14);
  });

  it('scales the tile pitch by the fraction, so the seams still meet', () => {
    const tiles = at(14.5);
    const columns = [...new Set(tiles.map((tile) => tile.x))].length;
    const pitch = TILE_SIZE * Math.SQRT2;

    const lefts = [...new Set(tiles.map((tile) => Math.round(tile.left)))].sort((a, b) => a - b);
    expect(columns).toBeGreaterThan(1);
    expect((lefts[1] ?? 0) - (lefts[0] ?? 0)).toBe(Math.round(pitch));
  });

  it('covers the whole viewport at every fraction, leaving no bare edge', () => {
    for (const zoom of [12, 12.25, 12.5, 12.75, 13]) {
      const tiles = at(zoom);
      const pitch = TILE_SIZE * 2 ** (zoom - Math.floor(zoom));

      expect(Math.min(...tiles.map((tile) => tile.left))).toBeLessThanOrEqual(0);
      expect(Math.max(...tiles.map((tile) => tile.left)) + pitch).toBeGreaterThanOrEqual(400);
      expect(Math.max(...tiles.map((tile) => tile.top)) + pitch).toBeGreaterThanOrEqual(600);
    }
  });

  it('is unchanged at a whole zoom — the fractional path must not move the existing one', () => {
    expect(at(14)).toEqual(
      tilesCovering({ centre: { lat: 11.1949, lng: 119.4013 }, zoom: 14, width: 400, height: 600 }),
    );
    expect(at(14).every((tile) => tile.z === 14)).toBe(true);
  });
});


describe('the tiles are drawn at the size they are placed at (PL-2, founder-found on the phone)', () => {
  const at = (zoom: number) =>
    tilesCovering({ centre: { lat: 11.1949, lng: 119.4013 }, zoom, width: 400, height: 600 });

  it('carries the on-screen edge length, because placement alone leaves gaps', () => {
    for (const zoom of [12, 12.3, 13.75, 14]) {
      const pitch = TILE_SIZE * 2 ** (zoom - Math.floor(zoom));

      expect(at(zoom).every((tile) => Math.abs(tile.size - pitch) < 1e-9)).toBe(true);
    }
  });

  it('is exactly one tile wide at a whole zoom', () => {
    expect(at(15).every((tile) => tile.size === TILE_SIZE)).toBe(true);
  });

  it('LEAVES NO SEAM — each tile ends exactly where its neighbour begins', () => {
    for (const zoom of [12.25, 13.5, 14.9]) {
      const tiles = at(zoom);
      const column = tiles.filter((tile) => tile.x === tiles[0]?.x).sort((a, b) => a.top - b.top);
      const row = tiles.filter((tile) => tile.y === tiles[0]?.y).sort((a, b) => a.left - b.left);

      for (let i = 1; i < row.length; i += 1) {
        expect(row[i]!.left).toBeCloseTo(row[i - 1]!.left + row[i - 1]!.size, 6);
      }
      for (let i = 1; i < column.length; i += 1) {
        expect(column[i]!.top).toBeCloseTo(column[i - 1]!.top + column[i - 1]!.size, 6);
      }
    }
  });
});
