# MCP servers

`.mcp.json` configures two servers. **Claude Code reads that file directly**;
Codex and Gemini CLI keep MCP config elsewhere, so copy the snippets below once.

| Server         | What it gives the agent                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **playwright** | Real eyes: navigate a route, take an accessibility snapshot, screenshot at three widths. Used by `react-verify`.                      |
| **shadcn**     | Search and install components from any configured registry — including `@react-dev`, whose items carry their own atomic-layer target. |

## Claude Code

Nothing to do. `.mcp.json` at the project root is picked up automatically.

## Codex

MCP lives in `~/.codex/config.toml` (TOML, and the key is snake_case):

```toml
[mcp_servers.playwright]
command = "npx"
args = ["-y", "@playwright/mcp@latest"]

[mcp_servers.shadcn]
command = "npx"
args = ["shadcn@latest", "mcp"]
```

## Gemini CLI

```bash
npx shadcn@latest mcp init --client gemini
```

## Why the shadcn MCP matters here

Without it, adding a component is a CLI call _you_ have to make. With it the
agent searches the registry itself and installs the right item — so component
choice becomes deterministic in the same way `npm run gen` made structure
deterministic. The registry item decides the layer; the agent does not guess.

Verify it is connected by asking the agent to list available components. If it
cannot, check that `components.json` has the `registries` entry.
