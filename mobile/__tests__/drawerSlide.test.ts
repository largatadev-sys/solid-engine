import { readFileSync } from 'fs';
import { join } from 'path';

const source = readFileSync(join(__dirname, '..', 'src', 'maps', 'useDrawerSlide.ts'), 'utf8');


describe('the picker drawer slides rather than appearing (PL-2)', () => {
  it('travels on the native driver — a transform the JS thread cannot stall', () => {
    expect(source).toContain('useNativeDriver: true');
  });

  it('eases OUT on the way in and IN on the way out, which is what reads as physical', () => {
    expect(source).toContain('Easing.out(Easing.cubic)');
    expect(source).toContain('Easing.in(Easing.cubic)');
  });

  it('leaves faster than it arrives — a dismissal should not make you wait', () => {
    const inMs = Number(/DRAWER_IN_MS = (\d+)/.exec(source)?.[1]);
    const outMs = Number(/DRAWER_OUT_MS = (\d+)/.exec(source)?.[1]);

    expect(outMs).toBeLessThan(inMs);
  });

  it('moves the sheet and the scrim together, so the backdrop never lags the panel', () => {
    expect(source).toContain('Animated.parallel');
  });
});


describe('the drawer survives being closed and reopened (PL-2 founder pass)', () => {
  it('stays MOUNTED through the outro, or the closing animation never renders', () => {
    expect(source).toContain('mounted');
    expect(source).toContain('setMounted(false)');
    expect(source).toContain('finished');
  });

  it('resets the sheet below the fold on every open, so the second open animates too', () => {
    expect(source).toContain('translateY.setValue(travel)');
    expect(source).toContain('scrim.setValue(0)');
  });
});
