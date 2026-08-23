import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT_LAYOUT = join(__dirname, '..', 'app', '_layout.tsx');

function source(): string {
  return readFileSync(ROOT_LAYOUT, 'utf8');
}

function authGate(): string {
  const text = source();
  return text.slice(text.indexOf('function AuthGate'), text.indexOf('function Splash'));
}

describe('the navigator outlives the settling window', () => {
  it('never returns a splash INSTEAD of the stack, which unmounts the navigator', () => {
    expect(authGate()).not.toMatch(/return\s*<Splash\s*\/?>/);
  });

  it('renders the stack on every path through the gate, settling or not', () => {
    const body = authGate();
    const earlyReturns = body.match(/^\s+(if \(.*\))?\s*return (?!\()/gm) ?? [];

    expect(earlyReturns).toHaveLength(0);
    expect(body).toContain('<Stack');
  });

  it('shows the splash as an overlay above the stack rather than in place of it', () => {
    const body = authGate();

    expect(body).toMatch(/<Splash overlay \/>/);
    expect(body.indexOf('<Stack')).toBeLessThan(body.indexOf('<Splash overlay />'));
  });

  it('gives the overlay real coverage, or it would not hide the screen beneath it', () => {
    const text = source();
    const overlay = text.slice(text.indexOf('splashOverlay:'), text.indexOf('},', text.indexOf('splashOverlay:')));

    expect(overlay).toMatch(/absoluteFill|position: 'absolute'/);
    expect(overlay).toContain('backgroundColor');
    expect(overlay).toContain('zIndex');
  });

  it('still has an early splash before fonts load, which mounts no navigator at all', () => {
    const text = source();
    const rootLayout = text.slice(text.indexOf('function RootLayout'), text.indexOf('function AuthGate'));

    expect(rootLayout).toMatch(/return <Splash \/>/);
  });
});
