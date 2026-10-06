import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Dev-only endpoint behind the feedback toolbar.
 *
 * Entries move through three folders, and the folder IS the status:
 *
 *   .ai/inbox/    you sent it; nobody has started
 *   .ai/working/  the agent has it, or has finished and is awaiting your word
 *   .ai/done/     YOU confirmed it is done. Never read by the agent again.
 *
 * Nothing is ever deleted, and only you move an entry into `done/`. The agent
 * marking its own work complete is how a fix that did not actually fix anything
 * disappears -- you looked at the screen, it did not.
 *
 * Dev-only on purpose: it writes to the repo, so it must never exist in a
 * production build.
 */

const FOLDERS = ['inbox', 'working', 'done'];

function aiDir(root, folder) {
  return join(root, '.ai', folder);
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

async function collect(root) {
  const items = [];
  for (const folder of FOLDERS) {
    const dir = aiDir(root, folder);
    if (!existsSync(dir)) continue;
    for (const name of await readdir(dir)) {
      if (!name.endsWith('.json')) continue;
      const entry = await readJson(join(dir, name));
      if (!entry) continue;
      items.push({ ...entry, id: name, folder });
    }
  }
  // Newest first: the thing you just sent should be at the top of the list.
  return items.sort((a, b) => String(b.id).localeCompare(String(a.id)));
}

/** Find an entry by file name without trusting the caller's path. */
async function locate(root, id) {
  if (typeof id !== 'string' || id.includes('/') || id.includes('..') || !id.endsWith('.json')) {
    return null;
  }
  for (const folder of FOLDERS) {
    const file = join(aiDir(root, folder), id);
    if (existsSync(file)) return { file, folder };
  }
  return null;
}

function body(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('error', reject);
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(payload));
}

export function feedbackPlugin() {
  return {
    name: 'react-dev-feedback',
    apply: 'serve',
    configureServer(server) {
      const root = server.config.root;

      // List everything, so the toolbar can show what is in flight.
      server.middlewares.use('/__react-dev/feedback/list', (req, res, next) => {
        if (req.method !== 'GET') return next();
        void collect(root)
          .then((items) => json(res, 200, { items }))
          .catch((error) => json(res, 500, { error: error.message }));
      });

      // You confirming, or sending it back. The only way into `done/`.
      server.middlewares.use('/__react-dev/feedback/resolve', (req, res, next) => {
        if (req.method !== 'POST') return next();
        void (async () => {
          try {
            const { id, action } = await body(req);
            const target = action === 'done' ? 'done' : 'inbox';
            const found = await locate(root, id);
            if (!found) return json(res, 404, { error: `no entry ${String(id)}` });

            const entry = (await readJson(found.file)) ?? {};
            entry.status = action === 'done' ? 'done' : 'new';
            entry[action === 'done' ? 'confirmedAt' : 'reopenedAt'] = new Date().toISOString();
            if (action !== 'done') delete entry.agentNote;

            const dir = aiDir(root, target);
            await mkdir(dir, { recursive: true });
            await writeFile(found.file, JSON.stringify(entry, null, 2) + '\n', 'utf8');
            if (found.folder !== target) await rename(found.file, join(dir, id));

            server.config.logger.info(
              `\n  [feedback] ${id} -> ${target}${action === 'done' ? ' (confirmed by you)' : ' (reopened)'}\n`,
            );
            json(res, 200, { id, folder: target });
          } catch (error) {
            server.config.logger.error(`[feedback] ${error.message}`);
            json(res, 400, { error: error.message });
          }
        })();
      });

      server.middlewares.use('/__react-dev/feedback', (req, res, next) => {
        if (req.method !== 'POST') return next();
        void (async () => {
          try {
            const payload = await body(req);
            const dir = aiDir(root, 'inbox');
            await mkdir(dir, { recursive: true });

            const stamp = new Date().toISOString().replace(/[:.]/g, '-');
            const name = `${stamp}.json`;
            await writeFile(
              join(dir, name),
              JSON.stringify({ ...payload, status: 'new' }, null, 2) + '\n',
              'utf8',
            );

            const where = payload.file ? `${payload.file}:${payload.line}` : payload.selector;
            const intent = payload.intent ? `[${payload.intent}] ` : '';
            const note = payload.comment ? `\n  "${payload.comment}"` : '';
            server.config.logger.info(
              `\n  [feedback] ${intent}${where}${note}\n  -> .ai/inbox/${name}\n`,
            );
            json(res, 201, { id: name });
          } catch (error) {
            server.config.logger.error(`[feedback] ${error.message}`);
            json(res, 400, { error: error.message });
          }
        })();
      });
    },
  };
}
