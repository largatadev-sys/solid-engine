import { readFileSync } from 'fs';
import { join } from 'path';

const MAPS = join(__dirname, '..', 'src', 'maps');

const read = (file: string) => readFileSync(join(MAPS, file), 'utf8');


describe('tapping the map drops a pin — the wiring nothing else can see (PL-2)', () => {
  it('the surface hands the gesture a REF, never a synthetic event’s currentTarget', () => {
    const web = read('useMapGesture.web.ts');

    expect(web).toContain('surfaceRef');
    expect(web)
      .not.toContain('currentTarget');
  });

  it('the surface actually attaches that ref to the element the handlers sit on', () => {
    const surface = read('TileSurface.tsx');
    const attached = surface.slice(surface.indexOf('<View'), surface.indexOf('{tilesCovering'));

    expect(attached).toContain('ref={surfaceRef}');
    expect(attached).toContain('gesture.handlers');
  });

  it('the web fork binds pointerdown to the DOM NODE, not through an RN prop', () => {
    const web = read('useMapGesture.web.ts');

    expect(web).toContain("node.addEventListener('pointerdown'");
    expect(web)
      .not.toContain('onPointerDown');
  });


  it('both platform forks accept the same tap and ref parameters, so neither drifts', () => {
    for (const fork of ['useMapGesture.web.ts', 'useMapGesture.native.ts']) {
      const source = read(fork);

      expect(source).toMatch(/readonly onTap\?: \(x: number, y: number\) => void;/);
      expect(source).toMatch(/readonly surfaceRef\?: \{ current: unknown \};/);
    }
  });

  it('a tap is a release that barely travelled — not a separate press handler racing the drag', () => {
    for (const fork of ['useMapGesture.web.ts', 'useMapGesture.native.ts']) {
      expect(read(fork)).toContain('TAP_SLOP');
    }
  });

  it('the picker turns a tapped point into a pin and asks the geocoder to name it', () => {
    const picker = read('PlacePickerModal.tsx');

    expect(picker).toContain('onTapPoint={dropAt}');
    expect(picker).toContain('nameForPin(');
  });

  it('an auto-name never overwrites what the traveler typed', () => {
    const picker = read('PlacePickerModal.tsx');

    expect(picker).toMatch(/setLabel\(\(typed\) => \(typed\.trim\(\) === ''/);
  });
});
