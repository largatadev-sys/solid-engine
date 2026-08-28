import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MAX_SCREEN_CHARS, pairedScreenString, screenStringOf } from '../src/feedback/reportScreen';
import { SCREEN_LABELS } from '../src/feedback/screenLabels';

const APP_DIR = join(__dirname, '..', 'app');

const ROOT_KEY = '';


function routeKeys(): string[] {
  const keys: string[] = [];

  const walk = (directory: string, prefix: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const here = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(join(directory, entry.name), here);
        continue;
      }
      if (!entry.name.endsWith('.tsx')) continue;

      const withoutExtension = here.slice(0, -'.tsx'.length);
      const base = withoutExtension.split('/').pop();
      if (base === '_layout') continue;

      keys.push(base === 'index' ? withoutExtension.split('/').slice(0, -1).join('/') : withoutExtension);
    }
  };

  walk(APP_DIR, '');
  return keys;
}


describe('the screen label registry', () => {
  it('names every route file the app ships, so a new screen cannot arrive unlabelled', () => {
    const unlabelled = routeKeys().filter((key) => SCREEN_LABELS[key] === undefined);

    expect(unlabelled).toEqual([]);
  });

  it('labels nothing that is not a route, so the registry cannot rot the other way', () => {
    const routes = new Set([...routeKeys(), ROOT_KEY]);
    const stale = Object.keys(SCREEN_LABELS).filter((key) => !routes.has(key));

    expect(stale).toEqual([]);
  });
});


describe('the screen string a report carries', () => {
  it('pairs the human label with the route segments', () => {
    expect(screenStringOf(['(tabs)', '(home)'])).toBe('Home feed · (tabs)/(home)');
  });

  it('names the invite screen by its route PATTERN, never the live token', () => {
    const captured = screenStringOf(['join', '[token]']);

    expect(captured).toBe('Invite · join/[token]');
    expect(captured).toContain('[token]');
  });

  it('keeps trip ids out of the captured string', () => {
    const captured = screenStringOf(['(tabs)', '(trips)', 'itineraries', '[id]']);

    expect(captured).toContain('[id]');
    expect(captured).toBe('Trip overview · (tabs)/(trips)/itineraries/[id]');
  });

  it('falls back to bare segments when a route has no label, rather than blocking the report', () => {
    expect(screenStringOf(['some', 'unmapped', 'route'])).toBe('some/unmapped/route');
  });

  it('never exceeds the contract bound', () => {
    const absurd = Array.from({ length: 80 }, (unused, at) => `segment-${at}`);

    expect(screenStringOf(absurd).length).toBeLessThanOrEqual(MAX_SCREEN_CHARS);
  });

  it('truncates the segments and keeps the label whole, because the label is what a founder reads', () => {
    const enormous = Array.from({ length: 80 }, (unused, at) => `s${at}`).join('/');

    const captured = pairedScreenString(enormous, { [enormous]: 'Trip overview' });

    expect(captured.startsWith('Trip overview · ')).toBe(true);
    expect(captured.length).toBe(MAX_SCREEN_CHARS);
  });


  it('keeps the label even when the label alone fills the bound', () => {
    const hugeLabel = 'L'.repeat(MAX_SCREEN_CHARS + 40);

    const captured = pairedScreenString('a/b', { 'a/b': hugeLabel });

    expect(captured).toBe('L'.repeat(MAX_SCREEN_CHARS));
  });

  it('reads the root as the home feed rather than an empty string', () => {
    expect(screenStringOf([])).toBe('Home feed');
  });
});
