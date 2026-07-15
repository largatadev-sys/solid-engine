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
