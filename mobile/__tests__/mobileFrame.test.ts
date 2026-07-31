import { readFileSync } from 'fs';
import { join } from 'path';
import { MOBILE_FRAME_WIDTH } from '../src/components/mobileFrameContract';


const COMPONENTS = join(__dirname, '..', 'src', 'components');

function read(file: string): string {
  return readFileSync(join(COMPONENTS, file), 'utf8');
}

describe('the web preview renders in a phone-width frame (founder ruling 2026-07-31)', () => {
  it('uses the mock phone frame width, so the preview matches what the frames were drawn at', () => {
    expect(MOBILE_FRAME_WIDTH).toBe(393);
  });

  it('caps rather than fixes the width, so a narrow browser still fills', () => {
    const web = read('MobileFrame.web.tsx');

    expect(web).toContain('maxWidth: MOBILE_FRAME_WIDTH');
    expect(web).toContain("width: '100%'");
    expect(web).not.toMatch(/[^x]width: MOBILE_FRAME_WIDTH/);
  });

  it('adds nothing at all on native — a wrapper View there would be dead layout', () => {
    const native = read('MobileFrame.native.tsx');

    expect(native).toContain('<>{children}</>');
    expect(native).not.toMatch(/StyleSheet|maxWidth/);
  });

  it('wraps OUTSIDE the navigator, or the tab bar spans the browser while the scenes do not', () => {
    const root = readFileSync(join(__dirname, '..', 'app', '_layout.tsx'), 'utf8');
    const frameAt = root.indexOf('<MobileFrame>');
    const gateAt = root.indexOf('<AuthGate />');

    expect(frameAt).toBeGreaterThan(-1);
    expect(frameAt).toBeLessThan(gateAt);
  });
});
