"""
HarnessBuilder — the central orchestrator.

Wires together: client → router → prompts → memory → tools → tracker.
This is the "harness" the video describes: the infrastructure layer that
turns GLM from a "brain in a jar" into a production-ready system.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Iterator

from .client import GLMClient
from .memory import ConversationMemory
from .prompts import get_system_prompt
from .router import ClassificationResult, RouteConfig, TaskRouter
from .settings import settings
from .tools import ToolRegistry, build_default_registry
from .tracker import CostTracker, UsageRecord


@dataclass
class HarnessResponse:
    content: str
    classification: ClassificationResult
    usage: UsageRecord
    tool_calls_made: list[str] = field(default_factory=list)

    @property
    def category(self) -> str:
        return self.classification.category.value

    @property
    def confidence(self) -> float:
        return self.classification.confidence

    @property
    def savings_usd(self) -> float:
        return self.usage.cost_usd(self.usage.model) - self.usage.cost_usd(settings.baseline_model)


class HarnessBuilder:
    """
    Drop-in replacement for a frontier model API call.

    Usage:
        harness = HarnessBuilder(api_key="...")
        response = harness.chat("Write a Python function to reverse a linked list")
        print(response.content)
        print(harness.tracker.summary())
    """

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        system_prompt_extra: str = "",
        enable_tools: bool = True,
        tool_registry: ToolRegistry | None = None,
    ) -> None:
        self.client = GLMClient(api_key=api_key, model=model)
        self.router = TaskRouter()
        self.tracker = CostTracker()
        self.memory = ConversationMemory()
        self._system_prompt_extra = system_prompt_extra
        self._tool_registry: ToolRegistry | None = None

        if enable_tools:
            self._tool_registry = tool_registry or build_default_registry()

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------

    def chat(
        self,
        user_message: str,
        *,
        stream: bool = False,
        override_system: str | None = None,
        max_tool_rounds: int = 5,
    ) -> HarnessResponse:
        classification = self.router.classify(user_message)
        config = classification.config

        system_prompt = override_system or get_system_prompt(
            config.system_prompt_key, self._system_prompt_extra
        )

        # Rebuild memory with the right system prompt for this turn
        if self.memory.system_prompt != system_prompt:
            self.memory.system_prompt = system_prompt

        self.memory.add_user(user_message)

        tools = self._tool_registry.specs() if self._tool_registry else None
        tool_calls_made: list[str] = []

        # Agentic loop — supports multi-step tool use
        for _round in range(max_tool_rounds):
            response = self.client.chat(
                messages=self.memory.to_messages(),
                tools=tools,
                temperature=config.temperature,
                max_tokens=config.max_tokens,
            )

            if "tool_calls" in response and response["tool_calls"]:
                # Execute tool calls and feed results back
                self.memory.add_assistant(
                    content=response.get("content") or "",
                    tool_calls=response["tool_calls"],
                )
                for tc in response["tool_calls"]:
                    fn_name = tc["function"]["name"]
                    fn_args = tc["function"]["arguments"]
                    tool_calls_made.append(fn_name)
                    result = self._tool_registry.call(fn_name, fn_args)  # type: ignore[union-attr]
                    self.memory.add_tool_result(
                        tool_call_id=tc["id"],
                        name=fn_name,
                        content=result,
                    )
            else:
                # Final answer
                content = response["content"]
                self.memory.add_assistant(content)
                usage_rec = self.tracker.record(
                    response.get("usage", {}), task_category=classification.category.value
                )
                return HarnessResponse(
                    content=content,
                    classification=classification,
                    usage=usage_rec,
                    tool_calls_made=tool_calls_made,
                )

        # Fallback if we hit max rounds
        content = response.get("content", "[max tool rounds reached]")  # type: ignore[possibly-undefined]
        self.memory.add_assistant(content)
        usage_rec = self.tracker.record(
            response.get("usage", {}), task_category=classification.category.value  # type: ignore[possibly-undefined]
        )
        return HarnessResponse(
            content=content,
            classification=classification,
            usage=usage_rec,
            tool_calls_made=tool_calls_made,
        )

    def stream(self, user_message: str) -> Iterator[str]:
        """Streaming variant — yields text chunks, no tool support."""
        classification = self.router.classify(user_message)
        config = classification.config
        system_prompt = get_system_prompt(config.system_prompt_key, self._system_prompt_extra)
        self.memory.system_prompt = system_prompt
        self.memory.add_user(user_message)

        full_content = ""
        for chunk in self.client.chat(
            messages=self.memory.to_messages(),
            temperature=config.temperature,
            max_tokens=config.max_tokens,
            stream=True,
        ):
            full_content += chunk
            yield chunk

        self.memory.add_assistant(full_content)

    def reset(self) -> None:
        self.memory.clear()
