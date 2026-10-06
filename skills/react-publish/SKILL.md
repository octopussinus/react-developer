---
name: react-publish
description: Publish a shared component to the react-dev registry so other projects can install it. Use when a component has proved itself in more than one project, or when the user asks to share a component across projects.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# React Publish

**Toolbox skill** — not a pipeline stage. Called when a component has earned a place in more than one project.

Moves a component from "shared inside this project" to "installable by any
project" via the registry. **The last and most expensive step of the reuse
ladder**, because a registry item is a public API: every consumer inherits its
bugs, and you cannot un-ship one.

```
page  ->  module  ->  atomic layer  ->  registry
 (one page)  (two pages)  (two modules)   (two PROJECTS, here)
```

## Refuse unless all four hold

Check each one and say which you checked. Any failure stops the run — explain
why and what would have to change.

| Check | How | Why |
|---|---|---|
| **Used by a second project** | Ask which one, by name | The rule of three, one level up. "Might be useful" is how a registry fills with things nobody installs |
| **No domain knowledge** | `grep -nE "Order\|Invoice\|User\|Dog" <file>` — any type, prop or string naming your business | A registry item that knows what an `Order` is is useless to a project that has no orders |
| **Role tokens only** | `grep -nE "#[0-9a-fA-F]{3,8}\|rgb\(\|\[[0-9]+px\]" <file>` | A hardcoded colour ignores the consumer's theme and ships your brand into their app |
| **Correct layer** | The layer test in `react-component` §3 | `target` is baked into the item, so a wrong layer lands wrong in every consumer |

Two more that are cheap and worth stating:

- **No feature imports.** `grep -n "@/modules" <file>` must be empty. A shared
  layer cannot import a feature, and the consumer has different features anyway.
- **Has a story and a test.** They ship with the item. An item without them
  arrives as code nobody can see in isolation or trust.

## Procedure

1. **Confirm the second project**, by name, and what it needs the component for.
   If the answer is "no second project yet, but it feels generic", **stop** —
   say that publishing now is premature and that the component is already shared
   within this project, which is the correct state.
2. **Run the four checks** above on the real file. Quote the greps you ran.
3. **Locate the registry** — the `react-developer` repo, `registry/`. Ask for the
   path if it is not obvious; it is a different repo from the project you are in.
4. **Generate the entry.** Never hand-write it:
   ```bash
   cd <react-developer>/registry
   npm run gen -- <layer> <ComponentName> --from <abs path to the .tsx>
   ```
   That copies the component, its story and its test, adds the `registry.json`
   entry with the right `target` per layer, and works out which npm dependencies
   the consumer needs by subtracting what the template already ships.
5. **Replace the two `TODO` fields** it leaves in `registry.json`: a one-line
   `description`, and `meta.why` naming what the component composes and what it
   deliberately does not know. These are what a future reader uses to decide
   whether to install it.
6. **Build and check it installs:**
   ```bash
   npm run build                                    # in registry/
   cd <a test project> && npx shadcn@latest add <abs>/registry/public/r/<slug>.json --yes
   npm run verify
   ```
   An item that does not pass the gate in a clean project is not publishable,
   whatever it does in the project it came from.
7. **Report** what was added, the layer, and the dependencies declared. Name the
   install command the user can run **now** — the file path — and only promise
   `@react-dev/<slug>` if `curl -I <pages url>/r/<slug>.json` returns 200. An
   unpublished registry is the default state, not a failure.

## Hard rules

- NEVER publish a component used by only one project.
- NEVER hand-edit `registry.json`. The generator owns it; a missing `target`
  installs into the wrong atomic layer of someone else's project.
- NEVER publish with a hardcoded colour, radius or font size.
- NEVER publish a component that imports from `@/modules`.
- NEVER leave the `TODO` description or `meta.why` in place.
- NEVER rename or remove a published item to "fix" it — consumers have installed
  it. Change the source in `registry/items/` and rebuild.
- NEVER publish without installing it into a clean project first.

## Next

> **Published.** `<slug>` added as `<layer>`, dependencies: `<list>`. Installs
> clean into a fresh project and passes its gate.
> **Do next:** commit and push `registry/`, then install it where it is needed:
> `npx shadcn@latest add <abs>/registry/public/r/<slug>.json` — the path form
> works immediately. The short `@react-dev/<slug>` form needs the registry
> published to Pages first; say so rather than handing over a command that 404s.
> **Not published?** Say which of the four checks failed and what would change it.
