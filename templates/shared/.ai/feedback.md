# Feedback log

Append-only. Owned by the `react-feedback` skill. Never edit or delete an
entry — the occurrence counts are the whole signal, and a count you can edit
means nothing.

Format:

```markdown
## YYYY-MM-DD · <feature> · <file>:<line>

**Category:** <stable-kebab-category>
**Said:** "<what the human actually said>"
**Correct:** <what it should be>
**Occurrence:** <n>
**Status:** open | promoted → <mechanism>
```

Reuse an existing category rather than minting a near-duplicate; splitting a
category hides the pattern it exists to reveal.

---
