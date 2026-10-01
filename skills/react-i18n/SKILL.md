---
name: react-i18n
description: Add a locale or fill in missing translation keys, keeping every locale's key set identical. Use when the user wants to add a language or when the locale parity check fails.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# React i18n

Keeps locales structurally identical. A half-translated locale that ships is a
runtime hole no type-checker catches, so parity is enforced in CI:

```bash
npm run i18n:check    # every locale has exactly the keys `en` has
```

## Procedure

1. **Read the reference locale.** `en` defines the key set and the namespace
   split. `ls src/locales/en/` — one file per namespace.
2. **Mirror the structure exactly.** Same filenames, same nesting, same
   placeholder names (`{{count}}`, `{{name}}`). A renamed placeholder breaks
   interpolation silently.
3. **Translate.** For each key:
   - keep placeholders and ICU plural categories intact
   - respect the language's real plural rules — `one/other` is wrong for
     Polish, Russian or Arabic, which need `few`/`many`
   - leave product names and proper nouns untranslated
   - mark anything you are unsure of as `TODO:<lang>` rather than guessing; a
     wrong translation is harder to find than a missing one
4. **Register the locale** in `src/config/i18n.ts` — the locale list and the
   display name. Namespaces load lazily per locale, so nothing else changes.
5. **Verify.** `npm run i18n:check && npm run typecheck`.

## Hard rules

- NEVER add a key to one locale only. Add it to all, `TODO:` where unknown.
- NEVER eager-import locale files. The loader is dynamic so a 10-locale app does
  not ship 10 locales to every user.
- NEVER hardcode a date, number or currency format. `Intl.*` with the active
  locale.

## Report

Locale added, key count per namespace, `TODO:` count, and the parity result.
