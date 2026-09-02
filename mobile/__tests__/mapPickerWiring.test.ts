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
    expect(picker).toContain("left: '50%'");
    expect(picker).toContain("top: '50%'");
  });

  it('confirm commits the point under the pin, never a separately dropped one', () => {
    expect(picker).toContain('pin: { lat: view.centre.lat, lng: view.centre.lng');
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
    expect(picker).toContain('detailFrom(candidate, true)');
  });
});


describe('the picker is a drawer with one CTA (PL-2 founder pass)', () => {
  const picker = read('PlacePickerModal.tsx');

  it('has exactly one primary action — dismissing is the backdrop now', () => {
    expect(picker).toContain('PICKER_CONFIRM');
    expect(picker).not.toContain('PICKER_CANCEL');
  });

  it('dismisses by pressing outside the sheet', () => {
    expect(picker).toContain('scrimTarget');
    expect(picker).toContain('accessibilityLabel={PICKER_DISMISS}');
    expect(picker).toContain('onPress={onDismiss}');
  });

  it('is a FIXED height, so resolving text cannot resize the drawer under your thumb', () => {
    expect(picker).toContain('height: SHEET_HEIGHT');
    expect(picker).toContain('detail: { height: DETAIL_HEIGHT');
    expect(picker).not.toContain("maxHeight: '94%'");
  });

  it('floats search results OVER the map rather than inserting them into the column', () => {
    const overlay = picker.slice(picker.indexOf('overlay: {'), picker.lastIndexOf('overlayNotice'));

    expect(overlay).toContain("position: 'absolute'");
  });

  it('slides rather than appearing, and drives that animation itself', () => {
    expect(picker).toContain('useDrawerSlide');
    expect(picker).toContain('animationType="none"');
    expect(picker).toContain('transform: [{ translateY }]');
  });
});


describe('the map zooms by buttons and double tap only (PL-2 founder pass)', () => {
  it.each(['useMapGesture.web.ts', 'useMapGesture.native.ts'])('%s double taps to zoom', (fork) => {
    const source = read(fork);

    expect(source).toContain('DOUBLE_TAP_MS');
    expect(source).toContain('onZoom(1)');
  });

  it.each(['useMapGesture.web.ts', 'useMapGesture.native.ts'])('%s carries NO pinch', (fork) => {
    const source = read(fork);

    expect(source).not.toContain('pinch');
    expect(source).not.toContain('zoomAfterPinch');
  });

  it('the +/- controls are the deliberate zoom affordance', () => {
    const surface = read('TileSurface.tsx');

    expect(surface).toContain('ZOOM_IN_LABEL');
    expect(surface).toContain('ZOOM_OUT_LABEL');
  });
});


describe('the picker never asks the traveler to type a name (PL-2 founder pass)', () => {
  const picker = read('PlacePickerModal.tsx');

  it('has no name field — its visibility used to depend on the value it collected', () => {
    expect(picker).not.toContain('PLACE_LABEL');
    expect(picker).not.toContain('mustType');
    expect(picker).not.toContain('needsTyping');
  });

  it('saves the name the map resolved, and nothing else', () => {
    expect(picker).toContain('nameToSave(detail)');
  });
});
