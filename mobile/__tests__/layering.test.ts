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

// The files permitted to touch the network directly. ADR-001's rule is "no raw network in UI /
// logic code — go through a typed gateway"; these ARE the typed gateways, so the rule is about
// keeping the list short and deliberate, not empty. `apiClient` is our backend gateway;
// `firebaseWebRest` is the web preview's auth gateway (the Identity Toolkit REST calls the Firebase
// JS SDK would otherwise have made — S0.4, dropped because the SDK's auth registration is
// tree-shaken on web). Adding a file here is a real decision, which is the point.
const ALLOWED_TO_FETCH = [
  join('src', 'api', 'apiClient.ts'),
  join('src', 'auth', 'firebaseWebRest.ts'),
];

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

  it.each(files.filter((f) => !ALLOWED_TO_FETCH.some((allowed) => f.endsWith(allowed))))(
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

/**
 * The auth SDK surface stays inside its seam (S0.4).
 *
 * This rule was previously a design property that happened to hold — S0.2 confined Firebase to two
 * files, and the epic map's RNFirebase-migration note banks on it ("the blast radius is small *now*
 * and grows with every auth caller"). S0.4 spends that asset: the founders' web preview exists
 * *because* swapping the SDK meant writing two files, not auditing the app. A rule that valuable
 * should not survive on good intentions — every new `import auth from '@react-native-firebase/auth'`
 * in a screen is another file the next migration has to touch, and it would pass review on a busy
 * day precisely because it looks so ordinary.
 *
 * The allowlist is the seam, stated once. Adding a file to it is a real decision — which is the
 * point: it cannot happen by reflex.
 */
describe('the Firebase SDK lives only in the auth seam (S0.2 design, S0.4 dependency)', () => {
  const SEAM = [
    join('src', 'repositories', 'authRepository.native.ts'),
    join('src', 'repositories', 'authRepository.web.ts'),
    join('src', 'auth', 'firebaseTokenSource.native.ts'),
    join('src', 'auth', 'firebaseTokenSource.web.ts'),
    // The web preview's auth is the Identity Toolkit REST API, not the Firebase JS SDK (S0.4) — so
    // this file imports no `firebase/*` at all and the SDK-import ban below is vacuous for it. It
    // stays on the allowlist because it is still the auth seam: the one place the web preview's
    // credential flow lives.
    join('src', 'auth', 'firebaseWebRest.ts'),
    // Google's SDK is not Firebase's, but it is the same kind of doorway plumbing and the same
    // argument applies to it.
    join('src', 'auth', 'googleSignInConfig.ts'),
  ];

  const outsideTheSeam = [
    ...sourceFiles(join(MOBILE_ROOT, 'app')),
    ...sourceFiles(join(MOBILE_ROOT, 'src')),
  ].filter((file) => !SEAM.some((allowed) => file.endsWith(allowed)));

  // Import statements only, not any mention of the package. The first version of this rule grepped
  // bare package names and failed on `apiClient.ts`, which merely *explains in a comment* why it
  // does not own token refresh — a file the seam is working perfectly in. A rule that fires on prose
  // teaches people to delete the prose.
  const SDK_IMPORT =
    /(?:from\s*|require\(\s*)['"](?:@react-native-firebase\/|firebase\/|@react-native-google-signin\/)/;

  it.each(outsideTheSeam)('no direct Firebase/Google SDK import in %s', (file) => {
    expect(readFileSync(file, 'utf8')).not.toMatch(SDK_IMPORT);
  });

  it('the rule actually fires (guards against a regex that matches nothing)', () => {
    // Without this, a typo in SDK_IMPORT would make every check above pass vacuously — the failure
    // mode of every grep-based rule, and invisible precisely because green is what you wanted.
    expect("import auth from '@react-native-firebase/auth';").toMatch(SDK_IMPORT);
    expect("const { getAuth } = require('firebase/auth');").toMatch(SDK_IMPORT);
    expect('// a comment mentioning @react-native-firebase/auth is not an import').not.toMatch(
      SDK_IMPORT,
    );
  });

  it('the seam files exist (guards against the allowlist rotting after a rename)', () => {
    // Without this, renaming a seam file turns the rule vacuous: the allowlist would match nothing,
    // the SDK import would move to a file this suite happily ignores, and the check above would
    // still be green.
    for (const file of SEAM) {
      expect(statSync(join(MOBILE_ROOT, file)).isFile()).toBe(true);
    }
  });
});
