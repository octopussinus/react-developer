import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Which web files cannot be copied, and why -- the policy, kept apart from the
 * mechanics so it can be read (and argued with) in one place.
 */

/** Never ported: the web's dev tooling, entry point and build glue. */
export const SKIP = [
  [/^src\/dev\//, 'dev toolbar (web only)'],
  [/^src\/main\.tsx$/, 'web entry point -- src/app/_layout.tsx is the native one'],
  [/^src\/vite-env\.d\.ts$/, 'Vite types'],
  [/\.stories\.tsx?$/, 'Storybook story'],
  [
    /^src\/testing\/mocks\/browser\.ts$/,
    'browser service worker -- src/platform/mocks.ts replaces it',
  ],
  [
    /^src\/testing\/architecture\.test\.ts$/,
    "web layering test -- checks the web app's own folders",
  ],
  [/^src\/styles\//, 'stylesheets -- converted into src/styles/tokens.css'],
  [/^src\/config\/routes\.ts$/, 'route registry -- turned into src/app/ screens'],
  [/^src\/config\/env\.ts$/, 'environment -- rewritten to EXPO_PUBLIC_* (generated)'],
];

/**
 * The web app shell: router, frame, providers, guards. On native that job is
 * done by Expo Router layouts, so these are re-implemented, never copied --
 * and `src/app/` is Expo Router's routes folder, where a stray file BECOMES a
 * screen. Pages the registry points into src/app/ move to src/screens/.
 */
export const SHELL = /^src\/app\//;

/**
 * Packages that render to, or read from, a DOM. Anything else is assumed to be
 * plain JavaScript -- and a package that peer-depends on react-dom is caught
 * by `isWebOnlyPackage` without being listed.
 */
const WEB_ONLY = [
  /^react-dom(\/|$)/,
  /^react-router(-dom)?(\/|$)/,
  /^@tanstack\/react-router/,
  /^@radix-ui\//,
  /^radix-ui$/,
  /^lucide-react$/,
  /^sonner$/,
  /^vaul$/,
  /^cmdk$/,
  /^recharts$/,
  /^@xyflow\//,
  /^framer-motion$/,
  /^motion(\/|$)/,
  /^embla-carousel/,
  /^react-day-picker$/,
  /^input-otp$/,
  /^@fontsource/,
  /^next-themes$/,
  /^@dnd-kit\//,
  /^react-markdown$/,
  /^maplibre-gl$/,
  /^react-map-gl/,
  /^leaflet$/,
  /^react-leaflet$/,
  /^@tanstack\/react-virtual$/,
  /^@tanstack\/react-query-devtools$/,
];

/** What a native replacement usually is, so the worklist says more than "no". */
export const NATIVE_EQUIVALENT = {
  'react-router': 'expo-router (useRouter, useLocalSearchParams, <Link href>, <Redirect>)',
  'react-dom': 'react-native primitives',
  'lucide-react': '@/platform/icons (lucide-react-native, styled by className)',
  sonner: 'a toast on react-native (or Alert.alert)',
  vaul: 'a native sheet (expo-router modal / formSheet)',
  '@radix-ui': 'react-native primitives + Modal',
  recharts: "a 'use dom' component (expo DOM components) or victory-native",
  'embla-carousel-react': 'FlatList horizontal + pagingEnabled',
  'maplibre-gl': 'react-native-maps (needs a dev build) or a DOM component',
};

/**
 * Imports rewritten on the way across. lucide-react becomes the generated
 * `@/platform/icons`: the same icon names, from lucide-react-native, each
 * wrapped so `className="size-5 text-primary"` sizes and colours it -- Uniwind
 * only styles React Native's own components, so a bare native icon would
 * ignore the classes every copied file sizes its icons with.
 */
export const IMPORT_SWAPS = {
  'lucide-react': '@/platform/icons',
};

/** Allowed in a TEST file only: they run under Vitest in Node, not on a phone. */
const TEST_ONLY = [
  /^vitest(\/|$)/,
  /^@testing-library\/react$/,
  /^@testing-library\/user-event$/,
  /^@testing-library\/jest-dom/,
  /^msw\/node$/,
  /^node:/,
];

const peerCache = new Map();

/** A package that peer-depends on react-dom is a web component library. */
function peersOnReactDom(webRoot, name) {
  const root = name.startsWith('@') ? name.split('/').slice(0, 2).join('/') : name.split('/')[0];
  if (peerCache.has(root)) return peerCache.get(root);
  let answer = false;
  const manifest = join(webRoot, 'node_modules', root, 'package.json');
  if (existsSync(manifest)) {
    try {
      const pkg = JSON.parse(readFileSync(manifest, 'utf8'));
      answer = Boolean(pkg.peerDependencies && 'react-dom' in pkg.peerDependencies);
    } catch {
      answer = false;
    }
  }
  peerCache.set(root, answer);
  return answer;
}

export function packageName(specifier) {
  return specifier.startsWith('@')
    ? specifier.split('/').slice(0, 2).join('/')
    : specifier.split('/')[0];
}

export function isWebOnlyPackage(webRoot, specifier) {
  if (specifier in IMPORT_SWAPS) return false;
  if (WEB_ONLY.some((pattern) => pattern.test(specifier))) return true;
  if (specifier.startsWith('node:')) return true;
  return peersOnReactDom(webRoot, specifier);
}

export function isTestOnlyPackage(specifier) {
  return TEST_ONLY.some((pattern) => pattern.test(specifier));
}

export function equivalentFor(specifier) {
  const name = packageName(specifier);
  const key = Object.keys(NATIVE_EQUIVALENT).find(
    (candidate) => name === candidate || name.startsWith(`${candidate}/`),
  );
  return key ? NATIVE_EQUIVALENT[key] : null;
}

export function skipReason(rel) {
  const hit = SKIP.find(([pattern]) => pattern.test(rel));
  return hit ? hit[1] : null;
}

/**
 * Test infrastructure: runs under Vitest in Node/jsdom, never on the phone, so
 * a web-only package or `import.meta.glob` is fine in it -- Vitest IS Vite. The
 * mock handlers and factories are excluded: the app runs those on the device.
 */
export function isTestInfra(rel) {
  return /^src\/testing\//.test(rel) && !/^src\/testing\/mocks\/(handlers|factories)\//.test(rel);
}

/** Where a web file lives in the native app. Identity, except the web shell's pages. */
export function nativePathFor(rel) {
  return rel.startsWith('src/app/pages/') ? rel.replace('src/app/pages/', 'src/screens/') : rel;
}
