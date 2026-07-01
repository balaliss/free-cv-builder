"""Sliding-window conversation memory with automatic summarisation."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .settings import settings


@dataclass
class Turn:
    role: str  # "user" | "assistant" | "system" | "tool"
    content: str
    tool_calls: list[dict[str, Any]] | None = None
    tool_call_id: str | None = None
    name: str | None = None

    def to_message(self) -> dict[str, Any]:
        msg: dict[str, Any] = {"role": self.role, "content": self.content}
        if self.tool_calls:
            msg["tool_calls"] = self.tool_calls
        if self.tool_call_id:
            msg["tool_call_id"] = self.tool_call_id
        if self.name:
            msg["name"] = self.name
        return msg


class ConversationMemory:
    """
    Stores conversation turns and applies a sliding window.
    When the window exceeds `max_turns`, older exchanges are replaced
    with a compact summary placeholder so context stays manageable.
    """

    def __init__(
        self,
        system_prompt: str = "",
        max_turns: int | None = None,
        summarise_threshold: int | None = None,
    ) -> None:
        self.system_prompt = system_prompt
        self.max_turns = max_turns or settings.max_memory_turns
        self.summarise_threshold = summarise_threshold or settings.summarise_threshold
        self._turns: list[Turn] = []
        self._summary: str = ""  # compressed history of dropped turns

    # ------------------------------------------------------------------
    # Mutation
    # ------------------------------------------------------------------

    def add_user(self, content: str) -> None:
        self._turns.append(Turn(role="user", content=content))
        self._maybe_compact()

    def add_assistant(
        self,
        content: str,
        tool_calls: list[dict[str, Any]] | None = None,
    ) -> None:
        self._turns.append(Turn(role="assistant", content=content, tool_calls=tool_calls))

    def add_tool_result(self, tool_call_id: str, name: str, content: str) -> None:
        self._turns.append(
            Turn(role="tool", content=content, tool_call_id=tool_call_id, name=name)
        )

    def clear(self) -> None:
        self._turns.clear()
        self._summary = ""

    # ------------------------------------------------------------------
    # Serialisation
    # ------------------------------------------------------------------

    def to_messages(self) -> list[dict[str, Any]]:
        messages: list[dict[str, Any]] = []

        system_content = self.system_prompt
        if self._summary:
            system_content = (
                f"{system_content}\n\n"
                f"[Earlier conversation summary]\n{self._summary}"
            ).strip()

        if system_content:
            messages.append({"role": "system", "content": system_content})

        messages.extend(t.to_message() for t in self._turns)
        return messages

    @property
    def turn_count(self) -> int:
        return len(self._turns)

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _maybe_compact(self) -> None:
        if len(self._turns) <= self.summarise_threshold:
            return
        # Drop oldest half, summarising them into _summary
        drop_count = len(self._turns) // 2
        dropped = self._turns[:drop_count]
        self._turns = self._turns[drop_count:]

        # Build a lightweight text summary of dropped turns
        lines: list[str] = []
        for t in dropped:
            if t.role in ("user", "assistant") and t.content:
                prefix = "User" if t.role == "user" else "Assistant"
                snippet = t.content[:300].replace("\n", " ")
                lines.append(f"{prefix}: {snippet}...")
        new_block = "\n".join(lines)
        self._summary = (
            f"{self._summary}\n{new_block}".strip() if self._summary else new_block
        )
