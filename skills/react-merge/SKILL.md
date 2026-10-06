---
name: react-merge
description: Land a reviewed feature - check CI and the review, squash-merge, delete the branch, mark the roadmap entry done and name the next feature. Use after react-ship and a code review, when a feature is approved and ready to merge.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# React Merge

**Stage 11 of 11** of the react-dev pipeline — after `react-ship`, then `react-feature`. `react-dev status` shows where every feature stands.

Lands the branch and closes the loop back to the roadmap, so
the next feature starts from a known state.

## Refuse to merge on any of these

Check all of them and report every failure, not just the first:

| Check | How |
|---|---|
| gates green on the branch | `npm run verify && npm run e2e && npm run a11y && npm run visual` |
| CI green (if there is a PR) | `gh pr checks` — wait for in-progress, never merge "pending" |
| review happened | `## Code review` exists in `specs/NNN-<slug>/review.md` (written by `react-review`). Also `gh pr view --json reviews` where there is a remote |
| no unresolved blockers | `specs/NNN-<slug>/review.md` — any unticked `**blocker**` stops the merge |
| tasks complete | `tasks.md` fully ticked |
| base is current | `git fetch && git merge origin/<base>` into the branch first, then re-run the gates |

**Rebasing or merging the base in invalidates the gate run.** Re-run it. A branch
that passed against a stale base tells you nothing about what you are about to
merge.

## Merge

**Squash**, so one feature is one commit and the history reads as a list of
features rather than of keystrokes:

```bash
# with a PR
gh pr merge --squash --delete-branch

# locally (no remote)
git switch <base> && git merge --squash <branch> && git commit && git branch -d <branch>
```

Keep the squashed subject the same conventional line `react-ship` wrote, and put
the spec path in the body so the merge commit points at what it implemented.

## Close the loop — this is the part people skip

1. **Mark the roadmap entry done** in `specs/ROADMAP.md`, with the merge commit:
   `| 2 | \`dog-profile\` ✅ done (<sha>) | … |`
2. **Fold any promoted learning in.** If the review produced a correction worth
   keeping, run `react-feedback` — not doing so is how the same review comment
   arrives on the next feature.
3. **Name what is now unblocked.** Read the index: which features listed this one
   as a dependency are now startable, and which can run in parallel.
4. **Leave the spec folder.** `specs/NNN-<slug>/` is the record of what was agreed
   and verified; deleting it loses the only trail from design to merge.

## Hard rules

- NEVER merge with a failing gate, pending CI, an unresolved blocker, or no review.
- NEVER delete the spec folder.
- NEVER force-merge or `--admin` past a required check. If a check is wrong, fix
  the check in its own commit and say so.
- NEVER leave the roadmap unmarked. An unmarked merge means the next run of
  `react-feature` can pick a feature that is already built.

## Report

```
merged  002-dog-profile -> master  (squash, a1b2c3d)
branch  deleted
roadmap entry 2 marked done
unblocked  3 weight, 5 dashboard   (parallel)
```

Then:

## Next

> **Stage 11 of 11 complete — the pipeline is closed for this feature.** Merged as
> `<sha>`, branch deleted, roadmap entry ticked. This unblocked: <features>.
> **Do next:** **`/clear` first**, then `react-feature <N>`. The feature is
> landed and everything about it is on disk — carrying its spec, its dead ends
> and its gate output into the next one only crowds out the next one's.
> **Not sure what is next?** `react-dev status` — it reads the files and git.
