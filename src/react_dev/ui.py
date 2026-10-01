"""Terminal UI helpers: banner, arrow-key selection, hierarchical step tracker."""

from __future__ import annotations

import readchar
from rich.align import Align
from rich.console import Console
from rich.live import Live
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

console = Console()

BANNER = r"""
 ____                 _     ____             
|  _ \ ___  __ _  ___| |_  |  _ \  _____   __
| |_) / _ \/ _` |/ __| __| | | | |/ _ \ \ / /
|  _ <  __/ (_| | (__| |_  | |_| |  __/\ V / 
|_| \_\___|\__,_|\___|\__| |____/ \___| \_/  
"""

TAGLINE = "Feature-sliced React, deterministic generators, a loop that closes"


def show_banner() -> None:
    console.print(Align.center(Text(BANNER, style="bold cyan")))
    console.print(Align.center(Text(TAGLINE, style="italic bright_black")))
    console.print()


_STATUS = {
    "done": ("●", "green"),
    "pending": ("○", "bright_black"),
    "running": ("◐", "cyan"),
    "error": ("●", "red"),
    "skipped": ("○", "yellow"),
}


class StepTracker:
    """Ordered steps with live refresh. No emoji, stable ordering."""

    def __init__(self, title: str) -> None:
        self.title = title
        self._steps: list[dict[str, str]] = []
        self._index: dict[str, dict[str, str]] = {}
        self._refresh = None

    def attach_refresh(self, fn) -> None:
        self._refresh = fn

    def add(self, key: str, label: str) -> None:
        if key in self._index:
            return
        step = {"key": key, "label": label, "status": "pending", "detail": ""}
        self._steps.append(step)
        self._index[key] = step
        self._tick()

    def _set(self, key: str, status: str, detail: str = "") -> None:
        if key not in self._index:
            self.add(key, key)
        self._index[key]["status"] = status
        if detail:
            self._index[key]["detail"] = detail
        self._tick()

    def start(self, key: str, detail: str = "") -> None:
        self._set(key, "running", detail)

    def complete(self, key: str, detail: str = "") -> None:
        self._set(key, "done", detail)

    def error(self, key: str, detail: str = "") -> None:
        self._set(key, "error", detail)

    def skip(self, key: str, detail: str = "") -> None:
        self._set(key, "skipped", detail)

    def _tick(self) -> None:
        if self._refresh:
            self._refresh()

    def render(self) -> Panel:
        table = Table.grid(padding=(0, 1))
        table.add_column(width=2)
        table.add_column()
        table.add_column(style="bright_black")
        for step in self._steps:
            glyph, colour = _STATUS[step["status"]]
            label_style = "bright_black" if step["status"] == "pending" else ""
            table.add_row(
                Text(glyph, style=colour),
                Text(step["label"], style=label_style),
                Text(step["detail"]),
            )
        return Panel(table, title=self.title, border_style="cyan", padding=(1, 2))


def select_with_arrows(options: dict[str, str], prompt: str, default: str | None = None) -> str:
    """Arrow-key picker. Falls back to a numbered prompt on a dumb terminal."""
    keys = list(options)
    if not keys:
        raise ValueError("no options")
    cursor = keys.index(default) if default in keys else 0

    if not console.is_terminal:
        console.print(f"[cyan]{prompt}[/cyan]")
        for i, key in enumerate(keys, 1):
            console.print(f"  {i}. {options[key]}")
        raw = input(f"Choice [1-{len(keys)}] ({cursor + 1}): ").strip()
        if raw.isdigit() and 1 <= int(raw) <= len(keys):
            return keys[int(raw) - 1]
        return keys[cursor]

    def render():
        table = Table.grid(padding=(0, 1))
        table.add_column(width=2)
        table.add_column()
        for i, key in enumerate(keys):
            marker = "›" if i == cursor else " "
            style = "bold cyan" if i == cursor else ""
            table.add_row(Text(marker, style="cyan"), Text(options[key], style=style))
        return Panel(table, title=prompt, border_style="cyan",
                     subtitle="↑/↓ move · enter select · esc cancel", padding=(1, 2))

    with Live(render(), console=console, transient=True, auto_refresh=False) as live:
        while True:
            key = readchar.readkey()
            if key in (readchar.key.UP, "k"):
                cursor = (cursor - 1) % len(keys)
            elif key in (readchar.key.DOWN, "j"):
                cursor = (cursor + 1) % len(keys)
            elif key in (readchar.key.ENTER, "\r", "\n"):
                return keys[cursor]
            elif key in (readchar.key.ESC, readchar.key.CTRL_C):
                raise KeyboardInterrupt
            live.update(render(), refresh=True)
