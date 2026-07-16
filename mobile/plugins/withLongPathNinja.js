const { withAppBuildGradle } = require('expo/config-plugins');
const { existsSync } = require('fs');
const { execFileSync } = require('child_process');

/**
 * Points the Android C++ build at a long-path-capable ninja, because the release build cannot
 * complete on Windows without one.
 *
 * The failure it prevents (S0.4, found the first time anyone ran `assembleRelease` on this repo):
 *
 *     ninja: error: Stat(rngesturehandler_codegen_autolinked_build/CMakeFiles/...
 *       ...RNGestureHandlerDetectorShadowNode.cpp.o): Filename longer than 260 characters
 *
 * React Native's codegen mirrors each module's *source path* inside its object-file path, so the
 * generated names run to ~280 characters before anything of ours contributes. The Android SDK's
 * CMake 3.22.1 bundles **ninja 1.10.2**, which predates ninja's long-path support (added in 1.12 via
 * the `longPathAware` manifest + the Unicode Win32 APIs — ninja-build/ninja#1900). Windows itself is
 * not the limiter here: `LongPathsEnabled` is already 1 on this machine and the OS is willing. The
 * *tool* is the limiter, which is why "enable long paths in Windows" — the advice every search
 * result offers — does nothing.
 *
 * Why only the release build trips it: the debug variant's object paths sit just under the limit.
 * So `npm run android` has always worked, and always will, while the artifact that actually ships
 * cannot be built. That asymmetry is the trap — a toolchain that looks healthy right up to the
 * moment it has to produce a release.
 *
 * <p><strong>The mechanism is `CMAKE_MAKE_PROGRAM` in `defaultConfig`, and both halves of that cost
 * a wrong turn worth recording.</strong> First: the obvious-looking `android.ninjaPath` gradle
 * property does not exist — set it and the build accepts the file happily, changes nothing, and
 * fails with the identical error. AGP does not choose ninja; **CMake** does, defaulting to the one
 * beside it in the SDK's `cmake/3.22.1/bin`, so the override must reach CMake as one of its own
 * variables. Second: there is no `externalNativeBuild` block in the template to append to —
 * React Native's own Gradle plugin creates that configuration at build time
 * (`NdkConfiguratorUtils.kt`), reading `defaultConfig.externalNativeBuild.cmake.arguments` and
 * adding its defaults **only where absent** ("provided in an additive manner (do not override what
 * the user provided)"). So `defaultConfig` is the sanctioned seam: what we put there survives, and
 * RN's args compose with it rather than fighting it.
 *
 * <p>If this ever appears not to work, check the build log for which `ninja.exe` path is quoted in
 * the failing command — that string is ground truth, and it is what exposed the first attempt as a
 * no-op that had "succeeded".
 *
 * Why a config plugin: `android/` is generated and gitignored (CNG), so an edit to
 * `android/app/build.gradle` survives exactly until the next `expo prebuild` erases it — and the
 * error that returns is the one above, on a machine where it used to work. Same reasoning, same
 * mechanism, same reason as `withAndroidJdk`.
 *
 * Setup this expects (documented in CLAUDE.md's gotchas): a ninja >= 1.12 on PATH — `winget install
 * Ninja-build.Ninja` on Windows; every other platform's ninja is fine and unaffected by any of this.
 * `LARGATA_NINJA` overrides the lookup for a ninja that lives somewhere unusual (or on CI). Machine
 * paths belong in the environment, never in a tracked file.
 */

const MINIMUM_MAJOR = 1;
const MINIMUM_MINOR = 12;

/** Resolves ninja's absolute path — the env override first, then PATH. */
function findNinja() {
  const override = process.env.LARGATA_NINJA;
  if (override !== undefined && override !== '') {
    return existsSync(override) ? override : null;
  }

  try {
    // `where` returns every match, one per line; the first is what a build would pick.
    const found = execFileSync(process.platform === 'win32' ? 'where' : 'which', ['ninja'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const first = found.split(/\r?\n/).find((line) => line.trim() !== '');
    return first === undefined ? null : first.trim();
  } catch {
    return null; // Not on PATH.
  }
}

/** True when this ninja is new enough to handle >260-char paths (>= 1.12). */
function isLongPathCapable(ninjaPath) {
  try {
    const version = execFileSync(ninjaPath, ['--version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    const [major, minor] = version.split('.').map(Number);
    if (Number.isNaN(major) || Number.isNaN(minor)) return false;

    return major > MINIMUM_MAJOR || (major === MINIMUM_MAJOR && minor >= MINIMUM_MINOR);
  } catch {
    return false;
  }
}

module.exports = function withLongPathNinja(config) {
  // Only Windows has the 260-character limit; elsewhere the SDK's bundled ninja is fine and this
  // plugin has no reason to touch the build.
  if (process.platform !== 'win32') return config;

  const ninja = findNinja();

  // Deliberately silent-but-warned rather than throwing: a missing ninja must not break `prebuild`
  // for someone doing debug work, which is unaffected. The warning names the actual consequence
  // (release builds, not everything) so it is actionable rather than noise — and if it is ignored,
  // the release build fails with the 260-character error whose fix this message describes.
  if (ninja === null || !isLongPathCapable(ninja)) {
    console.warn(
      '[withLongPathNinja] No ninja >= 1.12 found. Debug builds are unaffected, but ' +
        '`assembleRelease` will fail with "Filename longer than 260 characters" — the SDK\'s ' +
        'bundled ninja 1.10 cannot write those paths. Fix: `winget install Ninja-build.Ninja` ' +
        '(or set LARGATA_NINJA to a ninja >= 1.12).',
    );
    return config;
  }

  return withAppBuildGradle(config, (modConfig) => {
    const gradle = modConfig.modResults;

    if (gradle.language !== 'groovy') {
      throw new Error(`[withLongPathNinja] Expected a Groovy build.gradle, found ${gradle.language}.`);
    }

    // Forward slashes: backslashes are escapes inside a Groovy string, and CMake accepts either on
    // Windows. The same trap `withAndroidJdk` documents for gradle.properties.
    const ninjaArg = `"-DCMAKE_MAKE_PROGRAM=${ninja.replace(/\\/g, '/')}"`;

    if (gradle.contents.includes('-DCMAKE_MAKE_PROGRAM=')) return modConfig; // Already pinned.

    // RN's plugin reads `defaultConfig.externalNativeBuild.cmake.arguments` and appends its own
    // defaults to whatever it finds, so declaring the block here is addition, not conflict.
    const defaultConfigBlock = /(defaultConfig \{)/;

    if (!defaultConfigBlock.test(gradle.contents)) {
      // Better a loud failure than a silent no-op: this plugin's entire job is to change what the
      // build does, and its first version failed by changing nothing while looking like it worked.
      throw new Error(
        '[withLongPathNinja] No defaultConfig block found in app/build.gradle — the template ' +
          'changed shape and this plugin would silently do nothing.',
      );
    }

    gradle.contents = gradle.contents.replace(
      defaultConfigBlock,
      `$1
        externalNativeBuild {
            cmake {
                // Injected by plugins/withLongPathNinja.js (S0.4). The SDK's CMake 3.22.1 bundles
                // ninja 1.10, which cannot write the >260-char paths RN's codegen produces on
                // Windows; this points CMake at a 1.12+ ninja instead. RN's gradle plugin adds its
                // own arguments around this one — it only fills in what is absent.
                arguments ${ninjaArg}
            }
        }`,
    );

    return modConfig;
  });
};
