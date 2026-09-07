import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';


const MOBILE_ROOT = join(__dirname, '..');

const REPOSITORIES = join(MOBILE_ROOT, 'src', 'repositories');

const OLD_ROOT = '/v1/itineraries';

const STILL_ON_THE_OLD_ROOT: Record<string, string[]> = {
  'diaryRepository.ts': ['the diary entries are content and move with the itinerary story'],
  'tripRepository.ts': [
    'forking answers from the old package and has no twin until the itinerary story',
    'publishing and unpublishing stay on the act the shipped app already calls, so this story'
      + ' changes no behaviour a traveler can reach; the itinerary story moves them with the readers',
  ],
};

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

  it.each(repositoryFiles().filter((file) => !(file in STILL_ON_THE_OLD_ROOT)))(
    '%s names no old-grammar path',
    (file) => {
      expect(linesNamingTheOldRoot(file)).toEqual([]);
    },
  );

  it('the repositories still on the old root name only the routes that have no twin', () => {
    const lines = linesNamingTheOldRoot('tripRepository.ts');

    expect(lines).toHaveLength(3);
    expect(lines.filter((line) => line.includes('/fork'))).toHaveLength(1);
    expect(lines.filter((line) => line.includes('/publish'))).toHaveLength(1);
    expect(lines.filter((line) => line.includes('/unpublish'))).toHaveLength(1);
  });

  it('publishing stays on the act the shipped app already calls, so no behaviour moves', () => {
    const source = readFileSync(join(REPOSITORIES, 'tripRepository.ts'), 'utf8');

    expect(source).toContain('`/v1/itineraries/${id}/publish`');
    expect(source).toContain('`/v1/itineraries/${id}/unpublish`');
    expect(source).not.toContain('`/v1/trips/${id}/publish`');
    expect(source).not.toContain('`/v1/trips/${id}/unpublish`');
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
