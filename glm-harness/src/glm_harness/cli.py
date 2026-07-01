"""CLI entry point — `glm chat`, `glm classify`, `glm serve`, `glm stats`."""

from __future__ import annotations

from typing import Optional

import typer
from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.table import Table

from .router import TaskRouter
from .settings import settings

app = typer.Typer(
    name="glm",
    help="GLM Harness — auto-routing infrastructure for GLM models",
    no_args_is_help=True,
)
console = Console()


@app.command()
def chat(
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", envvar="GLM_API_KEY"),
    model: str = typer.Option(settings.glm_model, "--model", "-m"),
    no_tools: bool = typer.Option(False, "--no-tools"),
) -> None:
    """Start an interactive chat session with the GLM harness."""
    from .harness import HarnessBuilder

    harness = HarnessBuilder(api_key=api_key, model=model, enable_tools=not no_tools)
    console.print(Panel(
        f"[bold indigo]GLM Harness[/bold indigo] — model: [cyan]{model}[/cyan]  "
        f"baseline: [yellow]{settings.baseline_model}[/yellow]\n"
        "[dim]Type 'quit' to exit, 'reset' to clear memory, 'stats' for cost summary[/dim]",
        title="⚡ GLM Harness",
    ))

    while True:
        try:
            user_input = console.input("[bold blue]You:[/bold blue] ").strip()
        except (KeyboardInterrupt, EOFError):
            break

        if not user_input:
            continue
        if user_input.lower() in ("quit", "exit", "q"):
            break
        if user_input.lower() == "reset":
            harness.reset()
            console.print("[dim]Memory cleared.[/dim]")
            continue
        if user_input.lower() == "stats":
            _print_stats(harness.tracker.summary())
            continue

        with console.status("Thinking..."):
            resp = harness.chat(user_input)

        console.print(f"[dim]Routed → [cyan]{resp.category}[/cyan]  confidence={resp.confidence:.0%}[/dim]")
        if resp.tool_calls_made:
            console.print(f"[dim]Tools used: {', '.join(resp.tool_calls_made)}[/dim]")
        console.print(Markdown(resp.content))
        console.print()

    _print_stats(harness.tracker.summary())


@app.command()
def classify(
    prompt: str = typer.Argument(..., help="The prompt to classify"),
) -> None:
    """Classify a prompt and show routing decision without calling the API."""
    router = TaskRouter()
    result = router.classify(prompt)

    table = Table(show_header=False, box=None, padding=(0, 1))
    table.add_row("[dim]Category[/dim]", f"[bold cyan]{result.category.value}[/bold cyan]")
    table.add_row("[dim]Confidence[/dim]", f"{result.confidence:.0%}")
    table.add_row("[dim]Temperature[/dim]", str(result.config.temperature))
    table.add_row("[dim]Max tokens[/dim]", str(result.config.max_tokens))
    table.add_row("[dim]Description[/dim]", result.config.description)
    if result.matched_signals:
        table.add_row("[dim]Signals[/dim]", "  ".join(f"[yellow]{s}[/yellow]" for s in result.matched_signals))

    console.print(Panel(table, title="Task Classification"))


@app.command()
def serve(
    host: str = typer.Option(settings.host, "--host"),
    port: int = typer.Option(settings.port, "--port"),
    reload: bool = typer.Option(False, "--reload"),
) -> None:
    """Start the web UI and API server."""
    import uvicorn
    console.print(f"[bold]Starting GLM Harness web UI on[/bold] http://{host}:{port}")
    uvicorn.run("glm_harness.api:app", host=host, port=port, reload=reload)


@app.command()
def stats() -> None:
    """Show current session cost statistics (requires a running session)."""
    console.print("[yellow]Run 'glm chat' first to accumulate stats.[/yellow]")


def _print_stats(summary: dict) -> None:
    table = Table(title="Session Cost Summary", show_header=False, box=None, padding=(0, 2))
    table.add_row("Total calls", str(summary.get("total_calls", 0)))
    table.add_row("Total tokens", f"{summary.get('total_tokens', 0):,}")
    table.add_row(f"Cost ({summary.get('glm_model', '?')})", f"${summary.get('actual_cost_usd', 0):.6f}")
    table.add_row(f"Cost ({summary.get('baseline_model', '?')})", f"${summary.get('baseline_cost_usd', 0):.6f}")
    table.add_row("[bold green]Savings[/bold green]", f"[bold green]${summary.get('savings_usd', 0):.6f} ({summary.get('savings_pct', 0):.1f}%)[/bold green]")
    console.print(Panel(table, title="💰 Cost Tracker"))
