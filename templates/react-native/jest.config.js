/**
 * Native UI tests: `*.native.test.tsx`, React Native Testing Library on
 * jest-expo. Everything else is Vitest's (see vitest.config.ts).
 */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.native.test.{ts,tsx}'],
  // Parallel port workers' checkouts (`react-dev dispatch`).
  modulePathIgnorePatterns: ['<rootDir>/.worktrees/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.css$': '<rootDir>/tools/jest/style-mock.js',
  },
  setupFiles: ['<rootDir>/tools/jest/setup.js'],
  // jest-expo's list, plus the ESM-only packages this template adds: without
  // them a test of any component with an icon fails on `export` (found by a
  // parallel port worker, on a real app).
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg|lucide-react-native|uniwind)',
  ],
};
