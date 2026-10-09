# Porting in parallel: `react-dev dispatch`

Run in the mobile app's folder, after `git add -A && git commit`:

```bash
react-dev dispatch --dry-run          # the first wave: which files, which worker
react-dev dispatch                    # until nothing is left
react-dev dispatch --agent gemini --limit 4 --files 6 --waves 2
```

Before any agent starts, the base must type-check and lint: otherwise every
worker's files would be rejected for errors that were already there. Tests
already red are recorded and tolerated.

What one wave does:

1. `npm run port -- --plan` lists the **frontier**: files whose every import is
   already native. They never depend on each other, so separate agents can
   take them at once. The files that hold back the most come first.
2. The frontier is split by area of the app, `--files` per worker, `--limit`
   workers. Each worker is a headless agent CLI (`claude -p`, `codex exec`,
   `gemini --prompt`) in its own git worktree, installed before it starts.
3. A worker writes ONLY its files and their `.native.test.tsx`. Its other
   edits are listed in `ignored.txt` in its log, never landed; generated files
   (barrels, routes, PORT.md) are regenerated from all the landed work.
4. Each worker's files land one at a time, then `npm run port` +
   `npm run typecheck`. Red: that worker's files go back out (`landing.txt`).
5. Lint and tests on the whole wave. A test that passed before the wave and
   fails now (or a failing `.native.test.tsx`): the wave is undone and the run
   stops. A WEB test the port copied for the first time in this wave and that
   fails is reported, not undone -- check it on the web side first; the port
   carries web bugs over faithfully. A web test only comes across while its
   whole import chain loads in Node; once a native translation is in it, the
   native file's own test covers it.
6. The wave is committed, so the next wave's worktrees see it.

A worker that met a decision it may not make ends with
`[NEEDS CLARIFICATION: <file>: ...]` and is reported as blocked; its other
files still land. Those decisions, and the web shell (router, guards, app
frame), stay with you -- run `react-native-port` for them.

Every worker's prompt, transcript and raw event stream: `.ai/runs/<run>/` and
`react-dev runs`.
