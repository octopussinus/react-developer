import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { feedbackPlugin } from './feedback-plugin.mjs';

/**
 * The feedback endpoint writes to your repo and can now DELETE from it, so the
 * guards around it are worth a test: the folder an entry lands in is its
 * status, and `locate` is the only thing standing between a crafted id and an
 * arbitrary file.
 *
 * Driven through the plugin's own middleware registration rather than over
 * HTTP -- same code path, no port, no race.
 */
function harness(root) {
  const routes = new Map();
  const server = {
    config: { root, logger: { info() {}, error() {} } },
    middlewares: { use: (path, handler) => routes.set(path, handler) },
  };
  feedbackPlugin().configureServer(server);

  return (path, method, payload) =>
    new Promise((resolve, reject) => {
      const handler = routes.get(path);
      if (!handler) {
        reject(new Error(`no handler for ${path}`));
        return;
      }
      // Buffers, not strings: `Readable.from` is objectMode by default and the
      // endpoint concatenates the chunks, which only works on real Buffers.
      const req = Readable.from(
        payload === undefined ? [] : [Buffer.from(JSON.stringify(payload), 'utf8')],
      );
      req.method = method;
      const res = {
        statusCode: 200,
        setHeader() {},
        end(text) {
          resolve({ status: res.statusCode, body: text ? JSON.parse(text) : null });
        },
      };
      handler(req, res, () => {
        resolve({ status: 405, body: null });
      });
    });
}

let root;
let call;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'feedback-'));
  call = harness(root);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const send = (payload) => call('/__react-dev/feedback', 'POST', payload);
const resolveEntry = (payload) => call('/__react-dev/feedback/resolve', 'POST', payload);
const list = () => call('/__react-dev/feedback/list', 'GET');

const entryAt = (folder, id) => join(root, '.ai', folder, id);
const readEntry = async (folder, id) => JSON.parse(await readFile(entryAt(folder, id), 'utf8'));

describe('feedback endpoint', () => {
  it('files a new report in the inbox', async () => {
    const { status, body } = await send({ comment: 'the button is cut off' });
    expect(status).toBe(201);
    expect(await readEntry('inbox', body.id)).toMatchObject({
      comment: 'the button is cut off',
      status: 'new',
    });
  });

  it('moves an entry to done only when you confirm it', async () => {
    const { body } = await send({ comment: 'x' });
    await resolveEntry({ id: body.id, action: 'done' });

    expect(existsSync(entryAt('inbox', body.id))).toBe(false);
    const done = await readEntry('done', body.id);
    expect(done.status).toBe('done');
    expect(done.confirmedAt).toBeTruthy();
  });

  it('sends a not-fixed entry back to the inbox without the agent note', async () => {
    const { body } = await send({ comment: 'x' });
    await resolveEntry({ id: body.id, action: 'done' });
    await writeFile(
      entryAt('done', body.id),
      JSON.stringify({ comment: 'x', agentNote: 'I fixed it' }),
      'utf8',
    );

    await resolveEntry({ id: body.id, action: 'reopen' });
    const reopened = await readEntry('inbox', body.id);
    expect(reopened.status).toBe('new');
    expect(reopened.agentNote).toBeUndefined();
  });

  it('rewords an entry WITHOUT changing which folder it is in', async () => {
    const { body } = await send({ comment: 'vague' });
    await resolveEntry({ id: body.id, action: 'done' });

    const { status } = await resolveEntry({
      id: body.id,
      action: 'edit',
      comment: '  precise  ',
    });

    expect(status).toBe(200);
    // Still done: rewording a report does not undo your confirmation.
    const edited = await readEntry('done', body.id);
    expect(edited.comment).toBe('precise');
    expect(edited.editedAt).toBeTruthy();
    expect(existsSync(entryAt('inbox', body.id))).toBe(false);
  });

  it('deletes for real', async () => {
    const { body } = await send({ comment: 'sent by mistake' });
    const { status } = await resolveEntry({ id: body.id, action: 'delete' });

    expect(status).toBe(200);
    expect(existsSync(entryAt('inbox', body.id))).toBe(false);
    expect((await list()).body.items).toEqual([]);
  });

  it('refuses an id that climbs out of .ai/', async () => {
    const outside = join(root, 'package.json');
    await writeFile(outside, '{}', 'utf8');

    const { status } = await resolveEntry({ id: '../../package.json', action: 'delete' });

    expect(status).toBe(404);
    expect(existsSync(outside)).toBe(true);
  });

  it('lists every folder, newest first, with the folder as the status', async () => {
    const first = (await send({ comment: 'one' })).body.id;
    // Ids are timestamps; force a distinct one so the ordering is deterministic.
    await new Promise((done) => setTimeout(done, 5));
    const second = (await send({ comment: 'two' })).body.id;
    await resolveEntry({ id: first, action: 'done' });

    const { items } = (await list()).body;
    expect(items.map((item) => [item.id, item.folder])).toEqual([
      [second, 'inbox'],
      [first, 'done'],
    ]);
  });
});
