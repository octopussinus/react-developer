# Generated API contract

**Do not edit anything in this directory by hand.** `npm run api:generate`
overwrites it from `openapi.json` (configure the source in `openapi-ts.config.ts`).

This exists so that no API response type is ever hand-written. A guessed field
name type-checks cleanly and then fails in production — generating from the
contract removes that whole class of bug.

If a field you need is missing here, the contract is wrong or out of date. Say
so and stop; do not invent the field.
