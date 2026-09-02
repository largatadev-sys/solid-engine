import {
  MAX_ZOOM,
  MIN_ZOOM,
  TILE_SIZE,
  clampLatitude,
  clampZoom,
  latLngToWorld,
  normalizeLongitude,
  tilesCovering,
  worldToLatLng,
  worldSize,
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
    expect(clampZoom(given)).toBe(expected);
  });

  it('rounds a fractional zoom rather than serving a tile level that does not exist', () => {
    expect(Number.isInteger(clampZoom(12.4))).toBe(true);
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
