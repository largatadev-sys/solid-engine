import { readFileSync } from 'fs';
import { join } from 'path';
import { tileHref, tileKey } from '../src/maps/tileUrl';


const TILE = { x: 843, y: 493, z: 10, left: 0, top: 0 };


describe('a tile href is built from server-supplied configuration', () => {
  it('fills the z/x/y placeholders of whatever template the server sent', () => {
    expect(tileHref('https://tile.openstreetmap.org/{z}/{x}/{y}.png', TILE)).toBe(
      'https://tile.openstreetmap.org/10/843/493.png',
    );
  });

  it('works for a differently shaped provider, because the provider is not ours to assume', () => {
    expect(tileHref('https://example.test/v1/{z}-{x}-{y}@2x.jpg', TILE)).toBe(
      'https://example.test/v1/10-843-493@2x.jpg',
    );
  });

  it('identifies a tile by its address, so the same tile is one cache entry', () => {
    expect(tileKey(TILE)).toBe('10/843/493');
    expect(tileKey({ ...TILE, left: 999, top: 999 })).toBe(tileKey(TILE));
  });

  it('gives different tiles different keys', () => {
    expect(tileKey({ ...TILE, x: 844 })).not.toBe(tileKey(TILE));
    expect(tileKey({ ...TILE, z: 11 })).not.toBe(tileKey(TILE));
  });
});


describe('the surface survives what a free tile provider does on a bad day', () => {
  const source = readFileSync(join(__dirname, '..', 'src', 'maps', 'TileSurface.tsx'), 'utf8');

  it('draws tiles over a filled ground, so a failed tile leaves a gap and never a hole', () => {
    expect(source).toMatch(/backgroundColor: mapColors\.tileVoid/);
  });

  it('names no provider hostname; the tile source is server-supplied configuration', () => {
    expect(source).not.toMatch(/https?:\/\//);
    expect(source).toMatch(/config\.tileUrl/);
  });

  it('renders the attribution the licence requires, from that same configuration', () => {
    expect(source).toMatch(/config\.attribution/);
    expect(source).toMatch(/config\.attributionUrl/);
  });
});
