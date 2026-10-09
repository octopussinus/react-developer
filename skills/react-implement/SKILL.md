---
name: react-implement
description: Implement a feature from its clarified spec - components, hooks, data layer, i18n and tests. Use after react-spec and react-clarify, when the spec has no unresolved unknowns.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# React Implement

**Stage 6 of 11** of the react-dev pipeline — after `react-clarify`, then `react-verify`. `react-dev status` shows where every feature stands.

Turns `specs/NNN-<slug>/spec.md` into working code. Stop and read the spec
first; if it still contains `[NEEDS CLARIFICATION]`, run `react-clarify`
instead of guessing.

## Division of labour

| Generator does | You do |
|---|---|
| Folders, barrels, route registration, locale stubs, test/story skeletons | Business logic, data wiring, markup, assertions |

Call the generator for every new unit. It is not a convenience — it is what
keeps 50 agent-written features structurally identical and migratable:

```bash
npm run gen -- feature   <module> <page> --route=/<path>   # also writes its MSW mocks
npm run gen -- component <module> <page> <ComponentName>
npm run gen -- hook      <module> <page> use<Name>
npm run gen -- page      <slug> <PageName> --route=/<path>
npm run gen -- mock      <slug> <Entity>          # another entity's handler + factory
```

Never hand-create a file the generator owns. If the generator cannot express
what you need, say so and stop — that is a gap to fix in the generator, not to
route around.

## Procedure

1. Read the spec and `AGENTS.md`. Write `plan.md` only if the approach is
   non-obvious: the files you will touch and the order. Skip it for small work.
2. Fill `tasks.md` with a checklist derived from the spec's numbered behaviours.
   Tick items as you finish them, not at the end.
3. Load [references/web.md](references/web.md) and follow it: where code goes,
   the data layer, forms, the four states, routes, styling and tests.
4. **Make the mocks real before the UI.** `npm run gen -- feature` wrote a
   handler and factory stub; fill them in from the roadmap's mock-data section
   so `npm run dev` shows realistic data with no backend. Include the extremes —
   a long name, zero, null, a 200-row list. A factory that only makes tidy data
   hides every layout bug, and you will not find it later with a screenshot.
5. Implement in dependency order: types → data layer → hooks → components →
   page → route. Run `npm run typecheck` between layers; a type error found
   early is one error, found late it is twenty.
6. Write the tests as you go, not after. Every hook and every data module gets
   a test; every component gets a story. Mock at the **network** boundary with
   MSW — never stub your own modules, which stops testing the fetch path.
   Unhappy paths are `server.use(...)` overrides inside the test that needs them.
7. Finish with `react-verify`. **Not optional** — do not report completion
   without it.

## Hard rules

- NEVER invent an API field. Import from the generated contract. If the field is
  not there, stop and report it.
- NEVER import across features. Shared code graduates to `components/ui` or
  `lib` — and say so when you move something.
- NEVER leave a user-facing string or a raw colour in the markup.
- NEVER add a 500 or an empty response to the default handlers — that breaks
  every other test. Override per test.
- NEVER silence a check. No `any`, no `@ts-ignore`, no `eslint-disable` without
  an issue link. If a rule genuinely blocks correct code, say which rule and why.
- NEVER mark a task done in `tasks.md` that you did not actually finish.

## Report

Files created vs modified, the `tasks.md` state, the `react-verify` result, and
anything in the spec you could not implement — with the reason.

## Do not stop at the code — run the checks yourself

When the implementation is done, **continue straight into `react-verify`, then
`react-analyze`, then `react-review`** without waiting to be asked. All three
take their input from files you just wrote, and making the user type three
commands to find out whether your own work holds up is a chore you created.

Give each a fresh context if your host can (Claude Code has a subagent per
stage, returning only the verdict); elsewhere just run the three in order. The
chain is the requirement; the isolation is a bonus.

**A red gate gets three attempts, then you stop.** Fix only what the failure
pointed at, re-run the WHOLE gate after each attempt, and never reach green by
weakening a check — no deleted test, no `eslint-disable`, no edited
`eslint.config.js`, no updated visual baseline to make a diff disappear.

Architecture failures (`boundaries`, `components:check`) get the same three, and
their fixes are specific: move the code, promote it, or import it correctly.
Never make the rule stop firing. The table of legitimate fixes, and the table of
things that are never one: [references/retries.md](references/retries.md).

If three attempts do not clear it, **stop and report** — the gate, the real
error, what you tried, and the one decision you need. A blocked run that names
the trade is worth more than a green one that hid it.

`react-ship` and `react-merge` are NOT part of this. They commit, push and land
work, and nobody should discover their branch was pushed because a chain ran on.

## Next

> **Stages 6–9 complete.** N files created, M modified, `tasks.md` ticked, gates
> green, no drift, review findings: B blockers.
> **Do next:** `react-ship` — opens the PR. The checks already ran.
> **Stopped early?** Say which stage went red and what the one fix is.
