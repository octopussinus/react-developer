# Toolbar intents

Every `.ai/inbox/*.json` entry carries an `intent` — what the user picked in the
in-app toolbar after clicking an element. Act on the intent rather than
re-deriving it from the free-text note, which is optional and often empty.

| `intent` | The button said | What it means |
|---|---|---|
| `fix` | "Something is wrong with it" | A real correction. Run the promotion ladder |
| `reuse` | "I want this elsewhere too" | A promotion request — see below |
| `style` | "Change how it looks" | A **token** change: `react-theme`. Never a per-component hex |
| `wording` | "Fix the wording" | The string belongs in a locale file: `react-i18n` |
| `explain` | "Explain what this is" | Answer it. Nothing to record, nothing to promote |

Only `fix` is feedback about the project being wrong. The other four are
requests, so logging them in `.ai/feedback.md` inflates the occurrence counts
that decide whether a rule gets promoted — which is the one number this whole
skill depends on. Do not log them.

---

## `reuse` — the user wants a shared component

The entry gives you an exact `file`, `line` and `component`, so there is no
guessing about which element they meant.

### 1. Find the component, not the page

`file` is where the element was rendered, which may be a page. The thing worth
sharing is usually a block inside it. Read the file and name what you chose, so
the user can disagree before anything moves.

### 2. Ask where it is going. This is not optional.

"I want this elsewhere too" names no second place, and the second place is what
decides everything:

- it tells you the **layer** (two features → a shared layer; one feature, two
  screens → that feature's own `components/`)
- it tells you whether this is **real** — a component shared because someone
  might want it later is the premature abstraction the rule of three warns about

Ask as a single choice-list question (see `react-clarify`'s
`references/asking.md`), offering the features that plausibly need it. If the
answer is "not yet, just in general", **say that sharing now is premature**,
record the request in `.ai/feedback.md`, and stop. Two real uses, or none.

### 3. Apply the layer test

From `react-component` §3, first fit wins: atom (props only) → molecule
(composes atoms, may translate and read a store) → organism (a section, owns
state) → template (layout and slots).

**A component that knows what an `Order` is cannot be shared.** Lift the domain
parts into props first, and say that you did — this is the step that decides
whether the shared component stays usable or becomes a props soup.

### 4. Promote, never copy

```bash
npm run gen -- promote <feature> <ComponentName> --to=<layer>
```

That moves the component, its test and its story, retitles the story, rewrites
every importer to the barrel, and updates the barrel. Copying by hand is where an
importer gets left on the old path.

If the component lives in `src/app/` rather than inside a feature, `promote` does
not apply: generate it in the target layer (`npm run gen -- <layer> <Name>`) and
rewrite the original to import it.

### 5. Verify

```bash
npm run verify
```

`components:check` is part of it, so a leftover copy fails the build rather than
sitting there.

### What to report back

The component you chose and why, the layer and which test it passed, the domain
state you lifted into props, every importer that was rewritten, and the second
feature that justified the move.
