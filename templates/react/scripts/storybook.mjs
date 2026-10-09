/**
 * Storybook on this checkout's own port.
 *
 * `storybook dev -p 6006` is fine until a second checkout exists -- see
 * `tools/dev-port.mjs` for what goes wrong then. The port comes from the same
 * helper the dev server and the toolbar's Storybook button use, so all three
 * always agree.
 */
import { spawn } from 'node:child_process';
import process from 'node:process';
import { storybookPort } from '../tools/dev-port.mjs';

const port = String(storybookPort());
console.log(`Storybook for ${process.cwd()} -> http://localhost:${port}`);

const child = spawn('storybook', ['dev', '-p', port, ...process.argv.slice(2)], {
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error(error.message);
  process.exit(1);
});

// Pass the real outcome through, or `npm run verify`-style chaining in a script
// would treat a crashed Storybook as success.
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
