import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Dev-only endpoint behind the feedback toolbar. Writes one JSON file per
 * comment into `.ai/inbox/`, which the `react-feedback` skill reads.
 *
 * Dev-only on purpose: it writes to the repo, so it must never exist in a
 * production build.
 */
export function feedbackPlugin() {
  return {
    name: 'react-dev-feedback',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__react-dev/feedback', (req, res, next) => {
        if (req.method !== 'POST') return next();

        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', async () => {
          try {
            const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            const dir = join(server.config.root, '.ai', 'inbox');
            await mkdir(dir, { recursive: true });

            const stamp = new Date().toISOString().replace(/[:.]/g, '-');
            const file = join(dir, `${stamp}.json`);
            await writeFile(file, JSON.stringify(payload, null, 2) + '\n', 'utf8');

            const where = payload.file ? `${payload.file}:${payload.line}` : payload.selector;
            const intent = payload.intent ? `[${payload.intent}] ` : '';
            const note = payload.comment ? `\n  "${payload.comment}"` : '';
            server.config.logger.info(
              `\n  [feedback] ${intent}${where}${note}\n  -> .ai/inbox/${stamp}.json\n`,
            );

            res.statusCode = 204;
            res.end();
          } catch (error) {
            server.config.logger.error(`[feedback] ${error.message}`);
            res.statusCode = 400;
            res.end(JSON.stringify({ error: error.message }));
          }
        });
      });
    },
  };
}
