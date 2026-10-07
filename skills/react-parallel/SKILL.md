---
name: react-parallel
description: Build several roadmap features at once, each in its own git worktree, then land them one at a time. Use when the user wants more than one feature implemented and has answered the questions that block them.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Task
---

# React Parallel

**Toolbox skill** — not a pipeline stage. It runs stages 3–9 for several features at once, then hands each to `react-ship`.

Two mechanisms, and they solve different problems:

- **Claim plane** decides what may run together. The **module** is the lock.
- **Single-lane merge** decides how it lands. One at a time, rebase, re-run.

Worktrees isolate files, not meaning. Two pages of one module share its
`components/`, `lib/` and `types/`, so building them at once is two agents
editing one file — which git merges cleanly into something that does not build.

## 1. Ask the questions FIRST. All of them.

A parallel agent has no terminal and nobody is watching it, so every question
must be answered before anything starts.

```bash
react-dev parallel            # what is safe, and why the rest is not
```

Anything it lists as *"open questions"* is disqualified until `react-clarify`
has been through it. **Never start a batch with an unanswered marker** — the
agent will guess, and you will not see it guessing.

## 2. Ask how many

Use your host's question tool (`AskUserQuestion` in Claude Code), offering what
`react-dev parallel` actually returned:

- **One feature** — the normal loop, no worktrees, you watch it happen.
- **The whole safe batch** — N worktrees, N agents, you get N reports at the end.

Name the trade honestly: parallel is faster in wall-clock and worse for
steering — you will not see a wrong turn until it is finished. Never add a
feature `react-dev parallel` held back; its reasons are facts on disk.

## 3. Dispatch one agent per feature

One `react-feature-worker` subagent per feature, each with its own worktree:

```
Task(react-feature-worker, "Build roadmap feature 2 (dogs/profile) end to end.")
```

**Commit anything the workers need to read first.** A worktree branches from
`main`, so a design file sitting uncommitted in your checkout does not exist in
theirs — and a worker that cannot find it builds from the prose instead of
stopping, which is the expensive kind of silent. `git status` before dispatching.

Dispatch them in ONE message so they run concurrently. Each one runs
`react-feature` → `react-spec` → `react-implement`, and `react-implement` already
chains verify → analyze → review.

**A worker that hits a new `[NEEDS CLARIFICATION]` stops and reports it.** It
must not decide. That feature leaves the batch and comes back after
`react-clarify`.

## 4. Land them single-lane

Never merge two at once, however green they both are. Each passed its gate
against the base as it was when it started, which is not the base it is landing
on.

For each finished worktree, in the order they finished:

```bash
git -C <worktree> rebase main      # or merge main in
npm ci && npm run verify           # IN THAT WORKTREE, after the rebase
```

`npm ci` again because the rebase can bring in a dependency the base gained
while this branch was being built.

Only if that is green: `react-ship`, then `react-merge`. Then the next one
rebases onto the new `main` and repeats.

**This re-run is the only defence against a semantic conflict** — a merge with no
text conflict that still breaks the build, because one agent changed a signature
and another called the old one. No merge strategy catches that; running the gate
on the combined result does.

## 5. Clean up

`git worktree remove <path>` per landed feature, then `git worktree prune`.

## Hard rules

- NEVER start a batch containing an unanswered `[NEEDS CLARIFICATION]`.
- NEVER put two features of the same module in one batch.
- NEVER merge two branches without re-running the gate on the rebased result.
- NEVER let a worker answer its own clarification question.
- NEVER run `react-ship` or `react-merge` inside a worker. Landing is sequential
  and happens here, where the order is known.
- NEVER exceed what `react-dev parallel` returned to "save time".

## Next

> **Batch complete.** N features built in parallel, M landed single-lane, K held
> back (and why). Worktrees removed.
> **Do next:** `react-dev parallel` again for the next batch — features that were
> waiting on these are now unblocked.
> **Anything stop early?** Name which, at which stage, and the one fix.
