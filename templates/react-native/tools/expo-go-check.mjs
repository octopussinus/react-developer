#!/usr/bin/env node
/**
 * Does this app still open in Expo Go?
 *
 * Expo Go is a prebuilt app with a fixed set of native modules. A dependency
 * with native code outside that set builds fine, bundles fine, passes every
 * test -- and then crashes on the phone with "native module not found". This
 * makes that a failing check instead.
 *
 * The set comes from the installed `expo` package (bundledNativeModules.json),
 * so it moves with the SDK and is never a list maintained here.
 *
 * Exit 1 names each offender. To go past Expo Go deliberately, switch to a
 * development build (README.md, "Leaving Expo Go") and delete this script
 * from `verify`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { exit } from 'node:process';

const require = createRequire(join(process.cwd(), 'package.json'));
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const bundled = JSON.parse(readFileSync(require.resolve('expo/bundledNativeModules.json'), 'utf8'));

function packageDir(name) {
  try {
    return dirname(require.resolve(`${name}/package.json`));
  } catch {
    return null;
  }
}

/** Native code: an ios/ or android/ project, an Expo module config, or codegen. */
function hasNativeCode(dir) {
  if (!dir) return false;
  if (existsSync(join(dir, 'expo-module.config.json'))) return true;
  if (
    existsSync(join(dir, 'android', 'build.gradle')) ||
    existsSync(join(dir, 'android', 'build.gradle.kts'))
  )
    return true;
  if (
    existsSync(join(dir, 'ios')) &&
    readFileSync(join(dir, 'package.json'), 'utf8').includes('podspec')
  )
    return true;
  const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  return Boolean(manifest.codegenConfig);
}

const problems = [];
for (const name of Object.keys(pkg.dependencies ?? {}).sort()) {
  if (name === 'expo' || name === 'react-native' || name in bundled) continue;
  if (hasNativeCode(packageDir(name)))
    problems.push(`${name}: has native code that Expo Go does not include`);
}

if (problems.length > 0) {
  console.error(
    `\n  ${problems.length} dependenc${problems.length === 1 ? 'y' : 'ies'} will not run in Expo Go:\n`,
  );
  for (const problem of problems) console.error(`    ${problem}`);
  console.error(
    '\n  Use a JavaScript-only alternative or an Expo SDK module, or switch to a\n' +
      '  development build (README.md, "Leaving Expo Go").\n',
  );
  exit(1);
}
console.log(
  `  expo go ok: every native dependency ships in Expo Go (SDK ${String(pkg.dependencies.expo)})`,
);
