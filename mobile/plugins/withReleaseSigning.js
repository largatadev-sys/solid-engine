const { withAppBuildGradle } = require('expo/config-plugins');
const { existsSync } = require('fs');

/**
 * Signs release builds with the real keystore instead of Expo's debug placeholder.
 *
 * The template ships `signingConfig signingConfigs.debug` under `buildTypes.release`, with a comment
 * reading "Caution! In production, you need to generate your own keystore file." That default is not
 * merely insecure — the debug keystore is a publicly known key shipped with every Android SDK, so
 * anyone can sign an update to an app signed with it — it is also *sticky*: Android refuses to
 * install an update signed with a different key than the installed app, so the first artifact anyone
 * keeps decides the identity. Fixing it later means uninstall/reinstall for every holder.
 *
 * <p><strong>Custody is the real deliverable, and it is not in this file</strong> (S0.4 spec): the
 * keystore lives outside the repo, gitignored by pattern as a second line, with the file and its
 * passwords in the owner's password manager. This plugin only reads where it is. Everything here
 * comes from the environment, so a tracked file never learns a path, let alone a password:
 *
 *   LARGATA_KEYSTORE_PATH      absolute path to the keystore
 *   LARGATA_KEYSTORE_PASSWORD  store password
 *   LARGATA_KEY_ALIAS          key alias (defaults to `largata`)
 *   LARGATA_KEY_PASSWORD       key password (defaults to the store password — keytool's own default
 *                              when you press enter at its prompt)
 *
 * <p>Why a config plugin: `android/` is generated and gitignored (CNG), so editing
 * `android/app/build.gradle` survives until the next `expo prebuild` — after which release builds
 * silently return to the debug key. Silently is the problem: the build succeeds, the APK installs,
 * and nothing announces that the artifact's identity just changed. Same reasoning as
 * `withAndroidJdk` and `withLongPathNinja`.
 *
 * <p>With no keystore configured this leaves the template alone: a debug-signed release APK is
 * correct for local experimentation, and refusing to prebuild would block anyone doing debug work
 * (including CI, which never signs). The warning names what happened, because a release build
 * quietly using the debug key is exactly the thing nobody notices.
 */
module.exports = function withReleaseSigning(config) {
  const keystorePath = process.env.LARGATA_KEYSTORE_PATH;
  const storePassword = process.env.LARGATA_KEYSTORE_PASSWORD;

  if (keystorePath === undefined || keystorePath === '' || !existsSync(keystorePath)) {
    console.warn(
      '[withReleaseSigning] LARGATA_KEYSTORE_PATH unset or missing — release builds will be ' +
        'signed with the DEBUG key (a public key shipped in every Android SDK). Fine for local ' +
        'testing; never for anything anyone keeps installed. See the S0.4 spec.',
    );
    return config;
  }

  if (storePassword === undefined || storePassword === '') {
    // A path with no password is a half-configuration: it would fail deep inside Gradle with an
    // error about the keystore rather than about the missing variable. Say the true thing here.
    // (This is a build-time presence check; the value itself is read by the generated Gradle from
    // the environment, never handled here — see the injection below.)
    throw new Error(
      '[withReleaseSigning] LARGATA_KEYSTORE_PATH is set but LARGATA_KEYSTORE_PASSWORD is not. ' +
        'Both come from the environment (never a tracked file) — see the S0.4 spec.',
    );
  }

  return withAppBuildGradle(config, (modConfig) => {
    const gradle = modConfig.modResults;

    if (gradle.language !== 'groovy') {
      throw new Error(
        `[withReleaseSigning] Expected a Groovy build.gradle, found ${gradle.language}.`,
      );
    }

    // Forward slashes: backslashes are escapes inside a Groovy string, and `file()` accepts either
    // on Windows. The path is the ONLY value interpolated into the generated Gradle.
    const escapedPath = keystorePath.replace(/\\/g, '/');

    // The passwords and alias are read by the *generated Gradle* from the environment at eval time —
    // they are never written into build.gradle. Two reasons, both load-bearing:
    //   1. P3 (never let a secret enter a durable artifact): baking `storePassword 'literal'` would
    //      write the password to a file on disk, gitignored or not. Reading getenv() keeps it in the
    //      environment, where it already lives.
    //   2. It removes the escaping problem entirely: a password with a backslash, quote, or newline
    //      would otherwise have to be escaped into Groovy source correctly — and a near-miss there
    //      fails with a Groovy syntax error that names nothing about the password. No interpolation,
    //      no escaping bug.
    // The env-var names must match what this plugin documents and what the build environment sets.
    const releaseConfig = `
        release {
            // Injected by plugins/withReleaseSigning.js (S0.4). Only the keystore path is a literal;
            // the passwords are read from the environment at eval time and never written here.
            // Editing this generated file is pointless — prebuild rewrites it.
            storeFile file('${escapedPath}')
            storePassword System.getenv('LARGATA_KEYSTORE_PASSWORD')
            keyAlias System.getenv('LARGATA_KEY_ALIAS') ?: 'largata'
            keyPassword System.getenv('LARGATA_KEY_PASSWORD') ?: System.getenv('LARGATA_KEYSTORE_PASSWORD')
        }`;

    // Add the release signingConfig alongside the template's debug one.
    if (!gradle.contents.includes('signingConfigs {\n        release {')) {
      gradle.contents = gradle.contents.replace(
        /signingConfigs \{/,
        `signingConfigs {${releaseConfig}`,
      );
    }

    // Point buildTypes.release at it. The template's line is `signingConfig signingConfigs.debug`
    // *inside* `release {`; the debug buildType has an identical line, so an unanchored replace
    // would rewrite the wrong one and leave the release build on the debug key — the exact failure
    // this plugin exists to prevent.
    gradle.contents = gradle.contents.replace(
      /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/,
      '$1signingConfig signingConfigs.release',
    );

    return modConfig;
  });
};
