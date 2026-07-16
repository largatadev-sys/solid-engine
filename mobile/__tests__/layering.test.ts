import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * ADR-001 / P6 as an executable rule: "no raw fetch/API calls in UI code — everything through the
 * repository/local-cache layer's typed apiClient".
 *
 * A hard rule enforced only by review erodes; the erosion is invisible until a screen somewhere
 * is doing its own networking. This test is the mechanical half. It is deliberately crude — it
 * greps source text — because the rule it defends is worth more than the elegance of its check.
 */

const MOBILE_ROOT = join(__dirname, '..');
const ALLOWED_TO_FETCH = join('src', 'api', 'apiClient.ts');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (entry === 'node_modules' || entry.startsWith('.')) return [];
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

describe('the repository layer is the only path to the network (ADR-001)', () => {
  const files = [...sourceFiles(join(MOBILE_ROOT, 'app')), ...sourceFiles(join(MOBILE_ROOT, 'src'))];

  it('finds source files to check (guards against a vacuously passing test)', () => {
    expect(files.length).toBeGreaterThan(3);
  });

  it.each(files.filter((f) => !f.endsWith(ALLOWED_TO_FETCH)))(
    'no raw fetch/XHR in %s',
    (file) => {
      const source = readFileSync(file, 'utf8');

      expect(source).not.toMatch(/\bfetch\s*\(/);
      expect(source).not.toMatch(/XMLHttpRequest/);
      expect(source).not.toMatch(/\baxios\b/);
    },
  );

  it('screens reach the network through a hook or repository, never the apiClient directly', () => {
    const screens = sourceFiles(join(MOBILE_ROOT, 'app'));

    for (const screen of screens) {
      expect(readFileSync(screen, 'utf8')).not.toMatch(/from ['"].*api\/apiClient['"]/);
    }
  });
});

/**
 * The token layer as an executable rule (S0.3, ticket 05).
 *
 * Same reasoning as the fetch rule above: a hardcoded colour is invisible in review until the brand
 * decision lands — due before E4 — and turns a values-only change into a hunt through every screen.
 * The check greps, because the rule matters more than the elegance of its enforcement.
 */
describe('screens consume design tokens, never raw values (S0.3)', () => {
  const THEME_DIR = join(MOBILE_ROOT, 'src', 'theme');
  const styled = [...sourceFiles(join(MOBILE_ROOT, 'app')), ...sourceFiles(join(MOBILE_ROOT, 'src'))].filter(
    (file) => !file.startsWith(THEME_DIR),
  );

  it.each(styled)('no hex colour literals in %s', (file) => {
    const source = readFileSync(file, 'utf8');

    // #RGB, #RRGGBB, #RRGGBBAA — the whole family, since one form banned is no form banned.
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(source).not.toMatch(/\brgba?\(/);
  });

  it.each(styled)('no arithmetic on scale values in %s', (file) => {
    // `spacing.lg - 2` is not using the scale — it is using 22 while pretending, and it is exactly
    // how a token layer becomes decorative. If a screen needs a value the scale lacks, the scale is
    // missing a value; add it there, where every screen can see it.
    const source = readFileSync(file, 'utf8');

    expect(source).not.toMatch(/\b(spacing|radii)\.\w+\s*[+\-*/]/);
  });

  it.each(styled)('no bare fontSize in %s — the type scale owns sizes', (file) => {
    // Colours and font sizes are policed; raw layout numbers (maxWidth, minHeight) are not, because
    // no rule can tell `maxWidth: 420` — a property of one screen's composition — from a token.
    const source = readFileSync(file, 'utf8');

    expect(source).not.toMatch(/fontSize:\s*\d/);
  });

  it('the theme is the only place the palette exists', () => {
    // A guard against the check above passing because someone moved the values somewhere new: if
    // tokens.ts stops holding hex, the palette has gone somewhere this test is not looking.
    expect(readFileSync(join(THEME_DIR, 'tokens.ts'), 'utf8')).toMatch(/#[0-9a-fA-F]{6}\b/);
  });
});
