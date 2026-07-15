/**
 * jest-expo handles the RN transform chain (ESM in node_modules, the Expo runtime, RN mocks).
 * Scope: the repository/cache layer and the apiClient's shape and error translation (06b §7) —
 * no component-snapshot theatre.
 */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
};
