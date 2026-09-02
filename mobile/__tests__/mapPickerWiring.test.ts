import { readFileSync } from 'fs';
import { join } from 'path';

const MAPS = join(__dirname, '..', 'src', 'maps');

const read = (file: string) => readFileSync(join(MAPS, file), 'utf8');


describe('the map gesture is bound to the DOM, not to an RN prop (PL-2)', () => {
  it('the web fork binds pointerdown to the NODE — an RN-web View never fires onPointerDown', () => {
    const web = read('useMapGesture.web.ts');

    expect(web).toContain("node.addEventListener('pointerdown'");
    expect(web).not.toContain('onPointerDown');
  });

  it('the surface attaches the ref the web fork reads, or the binding has nothing to bind to', () => {
    const surface = read('TileSurface.tsx');
    const opening = surface.slice(surface.indexOf('<View'), surface.indexOf('{tilesCovering'));

    expect(opening).toContain('ref={surfaceRef}');
    expect(surface).toContain('surfaceRef,');
  });

  it('every listener it adds is removed again, so a reopened picker does not stack them', () => {
    const web = read('useMapGesture.web.ts');

    for (const event of ['pointermove', 'pointerup', 'pointercancel']) {
      expect(web).toContain(`window.addEventListener('${event}'`);
      expect(web).toContain(`window.removeEventListener('${event}'`);
    }
    expect(web).toContain("node.removeEventListener('pointerdown'");
  });
});


describe('the picker is pan-under-a-fixed-pin, with ONE way to place it (PL-2)', () => {
  const picker = read('PlacePickerModal.tsx');

  it('the pin is fixed at the centre — the map moves under it', () => {
    expect(picker).toContain('centrePin');
    expect(picker).toMatch(/left: '50%'/);
    expect(picker).toMatch(/top: '50%'/);
  });

  it('confirm commits the point under the pin, never a separately dropped one', () => {
    expect(picker).toMatch(/pin: \{ lat: view\.centre\.lat, lng: view\.centre\.lng/);
  });

  it('there is no second way to place a pin — no drop button, no tap-to-drop', () => {
    expect(picker).not.toContain('DROP_PIN_HERE');
    expect(picker).not.toContain('onTapPoint');
    expect(read('TileSurface.tsx')).not.toContain('onTapPoint');
  });

  it('the details resolve as the map settles, debounced rather than per-frame', () => {
    expect(picker).toContain('SETTLE_MS');
    expect(picker).toContain('setTimeout');
    expect(picker).toContain('clearTimeout');
    expect(picker).toContain('nameForPin(');
  });

  it('a search pick is held exact until the map is panned away from it', () => {
    expect(picker).toContain('exactAt');
    expect(picker).toContain('movedAwayFrom');
    expect(picker).toMatch(/detailFrom\(candidate, true\)/);
  });

  it('the name box appears only when nothing resolved — it is a fallback, not a chore', () => {
    expect(picker).toContain('mustType');
    expect(picker).toMatch(/needsTyping\(detail, typed\)/);
  });
});
