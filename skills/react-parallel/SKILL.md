---
name: react-parallel
description: Build several roadmap features at once, each as a real headless agent process in its own git worktree, then land them one at a time. Use when the user wants more than one feature implemented and has answered the questions that block them.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# React Parallel

**Toolbox skill** — not a pipeline stage. It runs stages 3–9 for several
features at once, then hands each to `react-ship`. Two mechanisms, and they
solve different problems:

- **Claim plane** decides what may run together. The **module** is the lock.
- **Single-lane merge** decides how it lands. One at a time, rebase, re-run.

Worktrees isolate files, not meaning: two pages of one module share its
`components/`, `lib/` and `types/`, so building them at once is two agents
editing one file, which git merges cleanly into something that does not build.

## 1. Ask the questions FIRST. All of them.

A worker has no terminal and nobody watching, so every question must be
answered before anything starts.

```bash
react-dev parallel            # what is safe, and why the rest is not
```

Anything it lists as *"open questions"* is disqualified until `react-clarify`
has been through it. **Never start a batch with an unanswered marker** — the
worker guesses, and you do not see it guessing.

## 2. Ask how many

Use your host's question tool (`AskUserQuestion` in Claude Code), offering what
`react-dev parallel` returned: **one feature** (the normal loop, you watch it)
or **the whole safe batch** (N worktrees, N processes, N reports). Name the
trade: parallel is faster in wall-clock and worse for steering — you will not
see a wrong turn until it is finished.

## 3. Commit first, then dispatch

```bash
git status --porcelain        # must be clean
react-dev dispatch --limit 3  # or --agent codex / --agent gemini
```

**A worktree branches from the last COMMIT.** A design file sitting uncommitted
in your checkout does not exist in theirs, and a worker that cannot find it
builds from the prose instead of stopping — the expensive kind of silent.
`dispatch` warns; do not talk past the warning.

Each worker is a real process — `claude -p`, `codex exec` or `gemini --prompt` —
running `react-feature` → `react-spec` → `react-implement` in its own worktree,
and `react-implement` already chains verify, analyze and review.

You are not watching their reasoning, and do not need to: every session lands in
`.ai/runs/<run>/<feature>/` — `stream.jsonl` (raw), `transcript.md` (readable),
`result.json` (verdict), `stderr.log`. **Read the transcript of anything that
did not come back green** before deciding what to do about it. `--dry-run`
prints the worktrees and the exact commands and starts nothing.

## 4. Land them single-lane

Never merge two at once, however green they both are. Each passed its gate
against the base as it was when it started, which is not the base it is landing
on.

For each worker that reported **ok**, in the order they finished:

```bash
git -C .worktrees/<branch> rebase main
cd .worktrees/<branch> && npm ci && npm run verify
```

`npm ci` again because the rebase can bring in a dependency the base gained
while this branch was being built. Only if that is green: `react-ship`, then
`react-merge`. Then the next one rebases onto the new `main` and repeats.

**This re-run is the only defence against a semantic conflict** — a merge with
no text conflict that still breaks the build, because one worker changed a
signature and another called the old one. No merge strategy catches that;
running the gate on the combined result does.

A worker that came back **blocked** hit a `[NEEDS CLARIFICATION]` and stopped,
which is correct: run `react-clarify` on it and put it in the next batch.

## 5. Clean up

`git worktree remove .worktrees/<branch>` per landed feature, then `git worktree
prune`. Leave the run logs: they are the only record.

## Hard rules

- NEVER start a batch containing an unanswered `[NEEDS CLARIFICATION]`.
- NEVER put two features of the same module in one batch.
- NEVER merge two branches without re-running the gate on the rebased result.
- NEVER let a worker answer its own clarification question.
- NEVER run `react-ship` or `react-merge` inside a worker. Landing is sequential
  and happens here, where the order is known.
- NEVER exceed what `react-dev parallel` returned to "save time".
- NEVER report a worker as finished without reading its `result.json`.

## Next

> **Batch complete.** N features built in parallel, M landed single-lane, K held
> back (and why). Run logs in `.ai/runs/<run>/`.
> **Do next:** `react-dev parallel` again — features that were waiting on these
> are now unblocked.
> **Anything stop early?** Name which, at which stage, and the one fix.
