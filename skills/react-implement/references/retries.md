# The retry budget

A failing gate gets **three attempts**, then you stop and report. The number is
not the interesting part — what counts as an attempt is.

## Three, and then stop

Per failing gate, not per run. If `lint` goes green and `test` then fails, the
test failure starts its own three.

Three because a fourth rarely helps: if three targeted fixes have not worked, the
problem is somewhere other than where you think it is, and the useful thing is
the real error in front of the user, not a fourth guess.

After each attempt, **re-run the whole gate**, not just the part that failed. A
fix that resolves a type error and breaks two tests is not progress, and you will
not notice unless you look.

## What an attempt may change

Only what the failure pointed at. A gate failure is not permission to tidy up
nearby code: it widens the diff, and the next failure becomes impossible to
attribute.

## What an attempt may NEVER do

The fastest route to green is always to weaken the check. That is the one route
that is closed:

| Never | Why |
|---|---|
| Delete or skip a failing test | The test was the only thing that knew |
| `eslint-disable`, `@ts-ignore`, `as any` | Silences the report, keeps the defect |
| Lower a coverage or duplication threshold | Moves the bar instead of clearing it |
| Edit `eslint.config.js`, `knip.json`, `.jscpd.json`, `tsconfig*.json` | The rule is the project's decision, not this feature's |
| Add `// duplicate-ok` without a real reason | An unjustified opt-out is a disabled rule |
| Update a visual baseline to make a diff go away | That is approving a change nobody looked at |

If the only way to green runs through this table, **that is the result**. Stop and
say so: "this passes only if X is weakened, which is a decision for you." A
blocked run that names the trade is worth more than a green one that hid it.

## Architecture failures get three too, but the fixes are specific

`boundaries`, `components:check` and the architecture tests fail because
something is in the wrong place. There are real fixes for that, and they are all
generator commands or import changes:

| Failure | The fix |
|---|---|
| A page imports another module | Import it from the global layer, or stop needing it |
| A page imports another page | Lift the shared part to the module: `gen -- promote <module> <page> <Name> --to=module` |
| Module shared code imports a page | Invert it — pass the data in as props |
| An atom imports a molecule | It is not an atom. Regenerate it at the right layer |
| Duplicated component | `gen -- promote`, or `// duplicate-ok: <reason>` with a real reason |
| Deep relative import | Use the `@/` alias or move the code |

What none of them is: editing the config so the rule stops firing. The rule
encodes a decision someone made about how this project is arranged; a feature
that cannot comply is telling you the arrangement is wrong, which is worth
hearing rather than silencing.

## Reporting a stop

Name the gate, the actual error, the three things you tried, and the one decision
you need. Not "verification failed".
