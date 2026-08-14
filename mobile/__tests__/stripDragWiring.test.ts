import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const MOBILE_ROOT = join(__dirname, '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      return entry === 'node_modules' ? [] : sourceFiles(full);
    }
    return entry.endsWith('.tsx') ? [full] : [];
  });
}


function horizontalScrollers(): string[] {
  return [join(MOBILE_ROOT, 'src'), join(MOBILE_ROOT, 'app')]
    .flatMap(sourceFiles)
    .filter((file) => /<ScrollView[^>]*\n?\s*horizontal/m.test(readFileSync(file, 'utf8')))
    .map((file) => relative(MOBILE_ROOT, file).replace(/\\/g, '/'));
}


describe('every horizontal strip is reachable by a mouse, which cannot drag an overflow div by itself', () => {
  it('finds the horizontal scrollers by scanning, so a new one cannot escape this test', () => {
    expect(horizontalScrollers().length).toBeGreaterThanOrEqual(8);
  });

  it.each(horizontalScrollers())('%s spreads the drag handlers onto its scroller', (file) => {
    const source = readFileSync(join(MOBILE_ROOT, file), 'utf8');

    expect(source).toContain('dragToScroll');
    expect(source).toContain('{...drag}');
  });
});
