import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';


const MOBILE_ROOT = join(__dirname, '..');

const REPOSITORIES = join(MOBILE_ROOT, 'src', 'repositories');

const OLD_ROOT = '/v1/itineraries';

const STILL_ON_THE_OLD_ROOT = new Set(['diaryRepository.ts', 'tripRepository.ts']);

const UNTWINNED_SUFFIXES = ['/fork'];

function repositoryFiles(): string[] {
  return readdirSync(REPOSITORIES).filter((entry) => entry.endsWith('.ts'));
}

function linesNamingTheOldRoot(file: string): string[] {
  return readFileSync(join(REPOSITORIES, file), 'utf8')
    .split('\n')
    .filter((line) => line.includes(OLD_ROOT));
}

describe('the client speaks the trip grammar (CM-3)', () => {
  it('finds the repositories to check (guards against a vacuously passing test)', () => {
    expect(repositoryFiles().length).toBeGreaterThan(3);
  });

  it.each(repositoryFiles().filter((file) => !STILL_ON_THE_OLD_ROOT.has(file)))(
    '%s names no old-grammar path',
    (file) => {
      expect(linesNamingTheOldRoot(file)).toEqual([]);
    },
  );

  it('every old-root path the trip repository keeps is a route with no twin', () => {
    const kept = linesNamingTheOldRoot('tripRepository.ts');

    expect(kept.length).toBeGreaterThan(0);
    for (const line of kept) {
      expect(UNTWINNED_SUFFIXES.some((suffix) => line.includes(suffix))).toBe(true);
    }
    for (const suffix of UNTWINNED_SUFFIXES) {
      expect(kept.filter((line) => line.includes(suffix))).toHaveLength(1);
    }
  });

  it('would fire if a twinned path were left on the old root', () => {
    const twinnedOnTheOldRoot = `apiClient.get(\`${OLD_ROOT}/\${id}/days\`)`;

    expect(twinnedOnTheOldRoot).toContain(OLD_ROOT);
    expect(UNTWINNED_SUFFIXES.some((suffix) => twinnedOnTheOldRoot.includes(suffix))).toBe(false);
  });

  it('publishing acts on the trip grammar, because published now means a live Itinerary exists', () => {
    const source = readFileSync(join(REPOSITORIES, 'tripRepository.ts'), 'utf8');

    expect(source).toContain('`/v1/trips/${id}/publish`');
    expect(source).toContain('`/v1/trips/${id}/unpublish`');
    expect(source).not.toContain('`/v1/itineraries/${id}/publish`');
    expect(source).not.toContain('`/v1/itineraries/${id}/unpublish`');
  });

  it('the publish mutations refetch the trip rather than writing a response into its cache', () => {
    const source = readFileSync(join(MOBILE_ROOT, 'src', 'query', 'itineraryQueries.ts'), 'utf8');
    const publishing = source.slice(
      source.indexOf('export function usePublishTrip'),
      source.indexOf('export type LifecycleAct'),
    );

    expect(publishing).not.toContain('onItineraryUpdated');
    expect(publishing.match(/invalidateQueries/g) ?? []).not.toHaveLength(0);
  });

  it('the published page still reads the old projection until the itinerary story', () => {
    expect(readFileSync(join(REPOSITORIES, 'tripRepository.ts'), 'utf8')).toContain(
      '/v1/published-itineraries/',
    );
  });

  it('every cache write in the trip-events handler goes through an imported key factory', () => {
    const source = readFileSync(join(MOBILE_ROOT, 'src', 'query', 'tripEvents.ts'), 'utf8');
    const writes = source.match(/(?:setQueryData|invalidateQueries)[\s\S]{0,80}?queryKey:\s*([^,\n]+)/g) ?? [];

    expect(writes.length).toBeGreaterThan(3);
    for (const write of writes) {
      expect(write).toMatch(/queryKey:\s*\w+Keys\.|queryKey:\s*queryKey/);
    }
  });

  it('the four places the app reads a missing trip know both refusal codes', () => {
    const sites = [
      join('src', 'components', 'ScreenMessage.tsx'),
      join('src', 'members', 'membershipErrors.ts'),
      join('src', 'polls', 'pollMessages.ts'),
      join('src', 'removal', 'removalFailure.ts'),
    ];

    for (const site of sites) {
      const source = readFileSync(join(MOBILE_ROOT, site), 'utf8');
      expect(source).toContain('ITINERARY_NOT_FOUND');
      expect(source).toContain('TRIP_NOT_FOUND');
    }
  });
});
