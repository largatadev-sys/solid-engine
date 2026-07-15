const { withGradleProperties } = require('expo/config-plugins');
const { existsSync } = require('fs');

/**
 * Pins the JDK the Android build runs on, because this repo's two release trains disagree about it.
 *
 * The backend is Java 25 (S0.1: Java 25 LTS, non-negotiable — Spring Boot 4 needs it), so a
 * developer's `JAVA_HOME` points at JDK 25. The Android Gradle Plugin does not support Java 25 and
 * fails at `configureCMakeDebug` reporting only "WARNING: A restricted method in java.lang.System
 * has been called" — a JDK warning masquerading as the entire error, which reads as a broken
 * toolchain rather than a version mismatch. ADR-010 says the trains are separate; it does not say
 * they need different JDKs on the same machine. They do.
 *
 * Android Studio bundles a JBR (Java 21) precisely because this collision is universal, so that is
 * the default. `LARGATA_ANDROID_JAVA_HOME` overrides it for anyone whose JDK 21 lives elsewhere
 * (or on CI, or on a Mac at the iOS activation) — machine-specific paths belong in the environment,
 * never in a tracked file.
 *
 * Why a config plugin rather than editing `android/gradle.properties`: that directory is generated
 * and gitignored (CNG), so an edit there survives exactly until the next `expo prebuild` wipes it —
 * and the failure it causes is this same inscrutable CMake error, on a machine where it used to
 * work. The plugin makes the pin part of the config that generates the directory.
 *
 * If no JDK 21 is found, this deliberately does nothing rather than writing a broken path: Gradle's
 * own "no JDK here" error is clearer than one produced by a helper trying to be clever.
 */
const ANDROID_STUDIO_JBR = 'C:\\Program Files\\Android\\Android Studio\\jbr';

module.exports = function withAndroidJdk(config) {
  const javaHome = process.env.LARGATA_ANDROID_JAVA_HOME ?? ANDROID_STUDIO_JBR;

  if (!existsSync(javaHome)) return config;

  return withGradleProperties(config, (modConfig) => {
    modConfig.modResults = modConfig.modResults.filter(
      (item) => !(item.type === 'property' && item.key === 'org.gradle.java.home'),
    );
    modConfig.modResults.push({
      type: 'property',
      key: 'org.gradle.java.home',
      // Gradle reads this file as java.util.Properties: a lone backslash starts an escape, so
      // Windows paths must use forward slashes (Gradle accepts them on every platform).
      value: javaHome.replace(/\\/g, '/'),
    });
    return modConfig;
  });
};
