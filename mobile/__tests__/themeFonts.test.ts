import { fontAssetNames, typography } from '../src/theme';
import { interFontMap } from '../src/theme/interFonts';

describe('every font the type scale names is a font the app loads (ADR-016)', () => {
  const familiesInUse = Object.values(typography)
    .map((role) => (role as { fontFamily?: string }).fontFamily)
    .filter((family): family is string => family !== undefined && family !== 'monospace');

  it('finds families to check (guards against a vacuously passing test)', () => {
    expect(familiesInUse.length).toBeGreaterThan(5);
  });

  it.each([...new Set(familiesInUse)])('%s is in the loaded font map', (family) => {
    expect(Object.keys(interFontMap)).toContain(family);
  });

  it('the loaded map and the declared asset names agree', () => {
    expect(Object.keys(interFontMap).sort()).toEqual([...fontAssetNames].sort());
  });

  it('every loaded font resolves to an asset rather than undefined', () => {
    for (const [name, asset] of Object.entries(interFontMap)) {
      expect(`${name}:${asset === undefined ? 'missing' : 'present'}`).toBe(`${name}:present`);
    }
  });
});
