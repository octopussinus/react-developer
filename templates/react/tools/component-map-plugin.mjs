import { execFile } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { promisify } from 'node:util';

/**
 * Dev-only endpoint behind the "Dev" overlay button.
 *
 * Answers the question you cannot answer by looking at the page: for each
 * component on screen, did the agent REUSE something that already existed, or
 * did it write it for this feature?
 *
 * "Written for this feature" is not a guess here. The pipeline gives every
 * feature its own branch, so a file ADDED on the current branch is new work and
 * everything else predates the feature. Git knows this exactly; a path does
 * not. Without that, a brand-new component dropped into `components/atoms/`
 * would look like reuse of the design system, which is precisely the mistake
 * worth seeing.
 *
 * Crossed with where the file lives, that gives four honest states -- see
 * `origin` and `scope` in the payload.
 */

const run = promisify(execFile);
const LAYERS = ['atoms', 'molecules', 'organisms', 'templates'];
const BASES = ['main', 'master'];

function isComponent(name) {
  return (
    name.endsWith('.tsx') &&
    !name.endsWith('.test.tsx') &&
    !name.endsWith('.stories.tsx') &&
    name !== 'index.tsx'
  );
}

async function walk(directory) {
  if (!existsSync(directory)) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.isFile() && isComponent(entry.name)) out.push(full);
  }
  return out;
}

function pascalFor(file) {
  return basename(file)
    .replace(/\.tsx$/, '')
    .split('-')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join('');
}

async function git(root, args) {
  const { stdout } = await run('git', args, { cwd: root, maxBuffer: 8 * 1024 * 1024 });
  return stdout.split('\n').filter(Boolean);
}

/**
 * Files this branch ADDED, plus anything untracked.
 *
 * Returns null when it cannot be determined -- no repo, or no base branch to
 * compare against. The overlay then says so rather than claiming everything is
 * pre-existing, which would be a confident lie.
 */
async function addedOnThisBranch(root) {
  try {
    const [branch] = await git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
    const base = BASES.find((candidate) => candidate !== branch);
    let added = [];
    for (const candidate of BASES) {
      if (candidate === branch) continue;
      try {
        await git(root, ['rev-parse', '--verify', candidate]);
        added = await git(root, ['diff', '--name-only', '--diff-filter=A', `${candidate}...HEAD`]);
        break;
      } catch {
        // try the next base
      }
    }
    // Uncommitted work is new by definition, whatever the base turned out to be.
    const untracked = await git(root, ['ls-files', '--others', '--exclude-standard']);
    const onBase = branch === 'main' || branch === 'master';
    return {
      branch,
      base: onBase ? null : (base ?? null),
      // On the base branch there is no "this feature", so only untracked files
      // can honestly be called new.
      added: new Set([...(onBase ? [] : added), ...untracked]),
      determined: true,
    };
  } catch {
    return { branch: null, base: null, added: new Set(), determined: false };
  }
}

export function componentMapPlugin() {
  return {
    name: 'react-dev-component-map',
    apply: 'serve',
    configureServer(server) {
      const root = server.config.root;

      server.middlewares.use('/__react-dev/component-map', (req, res, next) => {
        if (req.method !== 'GET') return next();

        void (async () => {
          try {
            const history = await addedOnThisBranch(root);
            const components = {};

            const add = (absolute, scope, layer) => {
              const rel = relative(root, absolute).split('\\').join('/');
              components[rel] = {
                name: pascalFor(rel),
                scope,
                layer,
                origin: history.determined
                  ? history.added.has(rel)
                    ? 'new'
                    : 'existing'
                  : 'unknown',
              };
            };

            for (const layer of LAYERS) {
              for (const absolute of await walk(join(root, 'src/components', layer))) {
                add(absolute, 'shared', layer);
              }
            }

            const featuresDir = join(root, 'src/features');
            if (existsSync(featuresDir)) {
              for (const entry of await readdir(featuresDir, { withFileTypes: true })) {
                if (!entry.isDirectory()) continue;
                for (const absolute of await walk(join(featuresDir, entry.name))) {
                  add(absolute, 'feature', entry.name);
                }
              }
            }

            for (const absolute of await walk(join(root, 'src/app'))) {
              add(absolute, 'app', 'app');
            }

            res.setHeader('content-type', 'application/json');
            res.end(
              JSON.stringify({
                branch: history.branch,
                base: history.base,
                determined: history.determined,
                components,
              }),
            );
          } catch (error) {
            server.config.logger.error(`[component-map] ${error.message}`);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
          }
        })();
      });
    },
  };
}
