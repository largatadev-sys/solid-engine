import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const QUERIES = join(__dirname, '..', 'src', 'query', 'itineraryQueries.ts');
const CREATE_SCREEN = join(
  __dirname, '..', 'app', '(tabs)', '(trips)', 'itineraries', 'new.tsx',
);

const source = (path: string): string => readFileSync(path, 'utf8');

function bodyOf(hookName: string): string {
  const text = source(QUERIES);
  const start = text.indexOf(`export function ${hookName}(`);
  if (start === -1) throw new Error(`${hookName} is gone — rename it here too`);
  const next = text.indexOf('\nexport ', start + 1);
  return text.slice(start, next === -1 ? undefined : next);
}


describe('the mutations that make the server bump the share card version', () => {
  it.each(['useUpdateItinerary', 'useUploadCover', 'useRemoveCover'])(
    '%s refreshes the invite link, or the copy button hands out a version the platform cached',
    (hook) => {
      expect(bodyOf(hook)).toContain('invalidateShareLink');
    },
  );

  it('the create flow attaches its cover outside those hooks, so it invalidates for itself', () => {
    const screen = source(CREATE_SCREEN);

    expect(screen).toContain('uploadCover');
    expect(screen).toContain('invalidateShareLink');
  });
});


describe('the mutations the server does NOT bump for', () => {
  it.each(['useAppendDay', 'useDeleteDay', 'usePublishTrip'])(
    '%s leaves the invite link alone, so an unrelated edit does not churn platform caches',
    (hook) => {
      expect(bodyOf(hook)).not.toContain('invalidateShareLink');
    },
  );
});
