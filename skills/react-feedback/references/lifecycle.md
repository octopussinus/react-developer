# The feedback lifecycle

Three folders, and **the folder is the status**:

| Folder | Means | Who moves it there |
|---|---|---|
| `.ai/inbox/` | New. Nobody has started | the toolbar, when the user sends it |
| `.ai/working/` | You claimed it, or finished and are awaiting the user's word | **you** |
| `.ai/done/` | The user confirmed it is actually fixed | **only the user**, from the toolbar |

Nothing is ever deleted.

## Claim before you work

```bash
mkdir -p .ai/working && mv .ai/inbox/<file>.json .ai/working/
```

The toolbar shows it as *in progress* the moment it lands there, so the user can
see what is being worked on without asking.

## When you finish, hand it back — do not close it

Set two fields and leave the file in `working/`:

```json
{
  "status": "awaiting-confirmation",
  "agentNote": "Bumped the heading to text-3xl at the sm breakpoint. Check it at phone width."
}
```

`agentNote` is shown in the toolbar directly above a **Yes, done / Not fixed**
pair, so write it for the person who will look at the screen: what you changed,
and what they should check. "Fixed the heading" tells them nothing they can
verify.

## Why you never write to `done/`

Because the only honest test of "is it fixed" is a human looking at the running
app. An agent that closes its own tickets closes the ones it got wrong too, and
those are exactly the ones that need a second look. The user clicking **Not
fixed** sends the entry back to `inbox/` and strips your `agentNote`, so the next
run starts clean rather than inheriting a claim that turned out to be false.

`done/` is also never read. Re-reading settled issues re-raises them and inflates
the occurrence counts that decide whether something becomes a permanent rule —
the one number this skill runs on.
