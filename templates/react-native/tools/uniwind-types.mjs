#!/usr/bin/env node
/**
 * Uniwind writes its className types when Metro starts. `tsc` in CI runs
 * without Metro, so generate them first -- with the themes the port generated.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const { extraThemes } = JSON.parse(readFileSync('src/styles/themes.json', 'utf8'));
execFileSync(
  'npx',
  [
    'uniwind',
    'generate-artifacts',
    '--css',
    './src/global.css',
    '--dts',
    './src/uniwind-types.d.ts',
    ...extraThemes.flatMap((theme) => ['--theme', theme]),
  ],
  { stdio: 'inherit' },
);
