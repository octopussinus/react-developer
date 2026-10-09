---
name: react-native-parallel
description: Port the web app to React Native with several headless agents at once - waves of workers (Claude Code, Codex or Gemini), each translating a few files in its own git worktree, landed, checked and committed wave by wave. Use when the user wants the port done faster than one file at a time, or asks to run it in parallel.
allowed-tools: Bash, Read, Glob, Grep
---

# React Native Parallel

**Toolbox skill** -- the parallel form of `react-native-port`. You do not
translate anything yourself here: you start `react-dev dispatch`, watch it,
and bring back to the user what only they can decide.

How a wave works (frontier, slices, landing, gates):
[../react-native-port/references/parallel.md](../react-native-port/references/parallel.md).

## 1. Check the floor

```bash
git status --porcelain            # must be empty
npm run port && npm run typecheck # the base must be green
react-dev dispatch --dry-run      # what the first wave would do
```

Dirty tree: show the user what is uncommitted and ask before committing it --
`dispatch` commits every wave and refuses a dirty tree. Red typecheck: fix it
first (`react-native-port`), or every worker's files are rejected on landing.

## 2. Ask, once, before spending money

Use your host's question tool (`AskUserQuestion` in Claude Code). Offer:

- **agent**: the installed CLIs (`react-dev check` lists them);
- **workers** (`--limit`, default 3) and **files per worker** (`--files`, 3-8);
- **how far**: one wave to look at it first (`--waves 1`, recommended the first
  time), a few, or until done (no `--waves`).

Say the trade plainly: each worker is a paid agent run (roughly $0.50-2 per
wave of a few files with Claude), and nobody steers it while it works.

## 3. Run it

```bash
react-dev dispatch --agent <agent> --limit <n> --files <k> --waves <w>
```

A wave takes minutes. Run it in the background if your host can, and check its
output; do not start a second dispatch while one runs.

## 4. Report, then hand back the decisions

From its output and `.ai/runs/<run>/`:

- files landed and committed, per wave; files left;
- every worker that was **blocked** -- quote its `[NEEDS CLARIFICATION: ...]`
  from `result.json` and ask the user, one decision at a time;
- every worker **rejected on landing** or **failed** -- read its
  `transcript.md` and `landing.txt` before saying why;
- web tests reported as failing on arrival -- they usually fail on the web
  side too; say so after checking.

Apply the user's decisions with `react-native-port` (one file, watched), then
offer the next wave.

## Hard rules

- NEVER start `dispatch` without the user choosing agent, size and how far.
- NEVER commit the user's own uncommitted work without asking.
- NEVER edit files inside `.worktrees/` -- they are the workers'.
- NEVER answer a worker's `[NEEDS CLARIFICATION]` yourself -- it is the user's.

## Next

> **Wave(s) done.** N files landed in W wave(s); L left; B decisions waiting.
> **Do next:** `react-native-verify` -- then open the new screens in Expo Go.
> **More to port?** Run `react-native-parallel` again for the next wave.
