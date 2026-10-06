# The ten defect classes

Each one is something **no rule in this project's gate can see**. For each: how to
find candidates, and the question that decides whether a candidate is real.

Verify against the source before writing any of these down. A grep hit is a
candidate, never a finding.

---

## 1. An effect that should not be an effect

```bash
grep -rn "useEffect" src/modules/<module>/<page>/ src/components/
```

`exhaustive-deps` checks that an effect's dependencies are *complete*. It cannot
tell you the effect should not exist. Three shapes, all wrong:

- **Deriving state.** `useEffect(() => setFullName(first + ' ' + last), [first, last])`
  — that is `const fullName = first + ' ' + last`. The effect adds a render and a
  frame where the value is stale.
- **Syncing a prop into state.** `useEffect(() => setValue(props.value), [props.value])`
  — the component now has two sources of truth that disagree for one frame.
- **Fetching.** This project has a data layer (`src/modules/*/*/api/`). A `useEffect`
  that fetches is bypassing cancellation, caching and error handling that already
  exist.

**Decide:** can this be computed during render, or does it belong in the event
handler that caused it? If yes, it is a finding.

## 2. A stale closure outside a dependency array

```bash
grep -rn "setInterval\|setTimeout\|addEventListener\|requestAnimationFrame" src/
```

`exhaustive-deps` only inspects hook dependency arrays. A callback registered
once captures the first render's values forever.

**Decide:** does this callback read state or props? Is it re-registered when those
change, or does it read through a ref? If neither, name the value that goes stale.

## 3. `key` identity on a list that reorders

```bash
grep -rn "key={\(i\|idx\|index\)}" src/
grep -rn "\.map(" src/modules/<module>/<page>/
```

No rule knows whether a list reorders. An index key on a list that sorts, filters
or deletes makes React reuse the wrong DOM node — focus jumps, input values stick
to the wrong row, animations play on the wrong element.

**Decide:** can the list be reordered, filtered, or have items removed from the
middle? Is there a stable `id`? Index keys are fine only for a static list.

## 4. State that duplicates derivable data

```bash
grep -rn "useState" src/modules/<module>/<page>/
```

**Decide:** for each piece of state, can it be computed from props, other state,
or the server data? Two sources of truth eventually disagree — say when.

## 5. Async that is never cancelled, or applied out of order

```bash
grep -rn "await \|\.then(" src/modules/<module>/<page>/
```

Two requests in flight resolve in whatever order the network chooses. Without a
guard, the slower one wins and the UI shows data for a filter the user left.

**Decide:** can two of these overlap? What cancels or ignores the stale one? This
class is the most common real **blocker** in a feature with filters or search.

## 6. Missing cleanup for a resource that is not a hook

```bash
grep -rn "new AbortController\|subscribe\|\.on(\|observe(" src/
```

**Decide:** is there a matching unsubscribe/abort/disconnect, and does it run on
unmount *and* when the inputs change? A listener added per render without cleanup
is a leak that grows while the user sits on the page.

## 7. Render-identity churn

```bash
grep -rn "value={{" src/              # a new context value object per render
grep -rn "React.memo\|useMemo\|useCallback" src/
```

A context `value={{ a, b }}` is a new object every render, so every consumer
re-renders regardless of memoisation. An inline arrow or object passed to a
`React.memo` child defeats the memo entirely.

**Decide:** is the identity recreated each render, and does something downstream
depend on it being stable? No downstream dependency means no finding — do not
report memoisation for its own sake.

## 8. Focus and live regions after an action

axe checks the DOM as it stands. It cannot check what happens *after* a click.

**Decide:** after submitting, deleting, filtering or opening a dialog — where does
keyboard focus go? Is an async result announced (`aria-live`), or does it change
silently for a screen-reader user? Does closing a dialog return focus to the
control that opened it?

This class is invisible to every automated check in the project, which makes it
worth the most attention.

## 9. What the UI does when the request throws

```bash
grep -rn "catch\|isError\|error" src/modules/<module>/<page>/
```

The spec names an error state; `react-analyze` checks one exists. This checks it
is *correct*: does it distinguish 403 from 500, is the message something a user
can act on, is a retry offered, and does a failed mutation leave the optimistic
update on screen?

**Decide:** trace one failure end to end and say what the user sees.

## 10. Mock data that never hits the spec's extremes

```bash
cat src/testing/mocks/handlers/*.ts
```

The feature's roadmap file lists the extremes the design must survive — a
40-character name, a null photo, 0 items, 200 items. Mocks that only return
tidy middle-of-the-road data mean nobody has seen the layout break.

**Decide:** compare the mock factory against the `**Extremes the design must
survive**` list in `specs/roadmap/NNN-<slug>.md`. Each missing one is a
`**should**`.

---

---

## Not class 11: duplicated components

The same component in two feature folders **used** to be a review judgement call,
because `jscpd`'s 3% threshold let a single copy through with a green gate. It is
now `npm run components:check`, which exits 1 and prints the `promote` command.

Do not report it here. A mechanical rule belongs in a failing build, not in a
review an agent may skip — and reporting what the gate already fails on is the
false-positive habit this whole skill exists to avoid.

---

## Calibration

Of these ten, classes **5** (races) and **8** (focus) produce the most real
blockers in practice, and class **7** (memoisation) produces the most false
positives. Weight your attention accordingly.

When you are unsure whether something is a defect or a decision, check the spec.
If the spec is silent and both behaviours are defensible, it is at most a
`**consider**` — and probably nothing.
