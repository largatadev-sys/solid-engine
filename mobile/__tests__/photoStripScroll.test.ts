import { readFileSync } from 'fs';
import { join } from 'path';


const MOBILE_ROOT = join(__dirname, '..');
const read = (...p: string[]) => readFileSync(join(MOBILE_ROOT, ...p), 'utf8');

const CAROUSELS = ['Postcard.tsx', 'PostcardStreamEntry.tsx', 'PostcardPreview.tsx'];


describe('paging is forked, because react-native-web turns it into snap that eats the drag', () => {
  it.each(CAROUSELS)('%s takes paging from the fork, never the raw prop', (file) => {
    const source = read('src', 'diary', file);

    expect(source).toContain('{...PAGING}');
    expect(source).not.toMatch(/^\s*pagingEnabled\s*$/m);
  });

  it('pages on native, where pagingEnabled is a real gesture and not CSS', () => {
    expect(read('src', 'diary', 'photoStripScroll.native.ts')).toContain('pagingEnabled: true');
  });

  it('declines it on web, where mandatory snap re-snaps every scrollLeft the drag writes', () => {
    const web = read('src', 'diary', 'photoStripScroll.web.ts');

    expect(web).toContain('export const PAGING = {} as const;');
    expect(web).not.toContain('pagingEnabled');
  });

  it('drags instantly and settles smoothly, rather than animating the drag itself', () => {
    const web = read('src', 'diary', 'photoStripScroll.web.ts');

    expect(web).toContain("target.style.scrollBehavior = 'auto'");
    expect(web).toContain("target.style.scrollBehavior = 'smooth'");
  });

  it('hides the scrollbar on both platforms — the dots carry navigation now', () => {
    for (const fork of ['photoStripScroll.web.ts', 'photoStripScroll.native.ts']) {
      expect(read('src', 'diary', fork)).toContain('SHOW_SCROLLBAR = false');
    }
  });
});
