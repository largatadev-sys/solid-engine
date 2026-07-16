// Metro config — exists solely to make the founders' web export load the Firebase JS SDK without
// crashing (S0.4).
//
// The bug it fixes: a white screen with "Component auth has not been registered yet", thrown at
// module load before React renders. Expo SDK 53+ turns on Metro's `unstable_enablePackageExports`
// by default, which changes how `package.json` `exports` are resolved. Firebase's JS SDK (v11+)
// relies on its CommonJS (`.cjs`) builds for this environment, and the new resolver picks a build
// whose auth-component registration side effect never runs — so `getAuth`/`initializeAuth` throw
// "not registered". This is a documented Expo↔Firebase incompatibility (expo/expo#36588), not a
// bug in our code; the fix is to restore Metro's traditional resolution and teach it `.cjs`.
//
// Scope note: this affects only how modules resolve in the bundle. The native builds do not import
// the Firebase JS SDK at all (the .native/.web auth fork keeps RNFirebase on the native side), so
// the only thing steered here is the JS SDK on the web side. Both `expo export --platform web` and
// the native bundles are re-verified after this change (S0.4 story gate).

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Firebase's JS SDK ships CommonJS builds Metro must be willing to read.
config.resolver.sourceExts.push('cjs');

// Keep package-exports resolution ON (Expo SDK 53+ default), but steer the *conditions* so the
// Firebase JS SDK resolves its `browser` build, never its `react-native` build, in the web bundle.
//
// The failure this fixes (white screen, "Component auth has not been registered yet"): `@firebase/
// auth` exports a `react-native` condition (dist/rn/index.js) whose auth-component registration
// expects the RN environment and never runs in a browser. Metro applies `react-native` for every
// target by default — including `expo export --platform web` — so the web bundle gets the RN build
// and auth is never registered. Listing `browser` ahead of `react-native` in the condition order
// makes web resolve the browser build. (Disabling package-exports entirely did NOT fix this on our
// versions — the RN condition still won; steering the conditions is what actually moves it.)
//
// This cannot affect the native app: the .native/.web auth fork means only the *web* files import
// `firebase/*` at all. The native bundle imports `@react-native-firebase`, which this does not
// touch — and the native export is re-verified after this change (S0.4 story gate).
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['browser', 'require', 'import'];

module.exports = config;
