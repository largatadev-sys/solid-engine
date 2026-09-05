import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MOBILE_ROOT = join(__dirname, '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return entry === 'node_modules' ? [] : sourceFiles(path);
    }
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

const VIEW = readFileSync(
  join(MOBILE_ROOT, 'src', 'itineraries', 'PublishedItineraryView.tsx'),
  'utf8',
);


describe('the published page carries the real pill now (S4.40 decision 7, frame 6)', () => {
  it('mounts it on the creator row for a consumer, and nowhere else', () => {
    expect(VIEW).toContain('<CreatorFollowPill');
    expect(VIEW).toContain("audience === 'consumer' && (");
  });

  it('wears the compact size the frame draws, driven by the same machine as the profile', () => {
    const pill = readFileSync(
      join(MOBILE_ROOT, 'src', 'profile', 'CreatorFollowPill.tsx'),
      'utf8',
    );

    const hook = readFileSync(join(MOBILE_ROOT, 'src', 'profile', 'useFollowPill.ts'), 'utf8');

    expect(pill).toContain('size="compact"');
    expect(pill).toContain('useFollowPill(');
    expect(hook).toContain('tapped(before)');
    expect(hook).toContain('settled(next.state, state)');
    expect(hook).toContain('followToastFor');
  });

  it('reads the relation from the creator profile, adding no field to the published response', () => {
    const pill = readFileSync(
      join(MOBILE_ROOT, 'src', 'profile', 'CreatorFollowPill.tsx'),
      'utf8',
    );

    expect(pill).toContain('usePublicProfile(');
    expect(VIEW).not.toContain('viewerRelation');
  });

  it('leaves no coming-soon refusal for following anywhere in the tree', () => {
    const offenders = sourceFiles(join(MOBILE_ROOT, 'src'))
      .concat(sourceFiles(join(MOBILE_ROOT, 'app')))
      .filter((path) => readFileSync(path, 'utf8').includes("comingSoon('follow')"));

    expect(offenders).toEqual([]);
  });

  it('actually scans files, so an empty offender list is not a broken walk', () => {
    expect(sourceFiles(join(MOBILE_ROOT, 'src')).length).toBeGreaterThan(100);
  });
});
