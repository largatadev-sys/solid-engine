import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';



const MOBILE_ROOT = join(__dirname, '..');

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


describe('screens consume design tokens, never raw values (S0.3)', () => {
  const THEME_DIR = join(MOBILE_ROOT, 'src', 'theme');
  const styled = [...sourceFiles(join(MOBILE_ROOT, 'app')), ...sourceFiles(join(MOBILE_ROOT, 'src'))].filter(
    (file) => !file.startsWith(THEME_DIR),
  );

  it.each(styled)('no hex colour literals in %s', (file) => {
    const source = readFileSync(file, 'utf8');

    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(source).not.toMatch(/\brgba?\(/);
  });

  it.each(styled)('no arithmetic on scale values in %s', (file) => {
    const source = readFileSync(file, 'utf8');

    expect(source).not.toMatch(/\b(spacing|radii)\.\w+\s*[+\-*/]/);
  });

  it.each(styled)('no bare fontSize in %s — the type scale owns sizes', (file) => {
    const source = readFileSync(file, 'utf8');

    expect(source).not.toMatch(/fontSize:\s*\d/);
  });

  it('the theme is the only place the palette exists', () => {
    expect(readFileSync(join(THEME_DIR, 'tokens.ts'), 'utf8')).toMatch(/#[0-9a-fA-F]{6}\b/);
  });
});


describe('the Firebase SDK lives only in the auth seam (S0.2 design, S0.4 dependency)', () => {
  const SEAM = [
    join('src', 'repositories', 'authRepository.native.ts'),
    join('src', 'repositories', 'authRepository.web.ts'),
    join('src', 'auth', 'firebaseTokenSource.native.ts'),
    join('src', 'auth', 'firebaseTokenSource.web.ts'),
    join('src', 'auth', 'firebaseWebRest.ts'),
    join('src', 'auth', 'googleSignInConfig.ts'),
    join('src', 'auth', 'googleIdentityServices.ts'),
  ];

  const outsideTheSeam = [
    ...sourceFiles(join(MOBILE_ROOT, 'app')),
    ...sourceFiles(join(MOBILE_ROOT, 'src')),
  ].filter((file) => !SEAM.some((allowed) => file.endsWith(allowed)));

  const SDK_IMPORT =
    /(?:from\s*|require\(\s*)['"](?:@react-native-firebase\/|firebase\/|@react-native-google-signin\/)/;

  it.each(outsideTheSeam)('no direct Firebase/Google SDK import in %s', (file) => {
    expect(readFileSync(file, 'utf8')).not.toMatch(SDK_IMPORT);
  });

  it('the rule actually fires (guards against a regex that matches nothing)', () => {
    expect("import auth from '@react-native-firebase/auth';").toMatch(SDK_IMPORT);
    expect("const { getAuth } = require('firebase/auth');").toMatch(SDK_IMPORT);
    expect('// a comment mentioning @react-native-firebase/auth is not an import').not.toMatch(
      SDK_IMPORT,
    );
  });

  it('the seam files exist (guards against the allowlist rotting after a rename)', () => {
    for (const file of SEAM) {
      expect(statSync(join(MOBILE_ROOT, file)).isFile()).toBe(true);
    }
  });
});
