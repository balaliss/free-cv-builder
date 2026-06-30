"""GLM client — thin wrapper around the OpenAI-compatible Zhipu AI API."""

from __future__ import annotations

from typing import Any, Iterator

from openai import OpenAI

from .settings import settings


def _build_client(api_key: str | None = None, base_url: str | None = None) -> OpenAI:
    return OpenAI(
        api_key=api_key or settings.glm_api_key or "dummy",
        base_url=base_url or settings.glm_base_url,
    )


class GLMClient:
    """Synchronous GLM client with streaming support."""

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str | None = None,
    ) -> None:
        self._client = _build_client(api_key, base_url)
        self.model = model or settings.glm_model

    # ------------------------------------------------------------------
    # Core chat completion
    # ------------------------------------------------------------------

    def chat(
        self,
        messages: list[dict[str, Any]],
        *,
        tools: list[dict[str, Any]] | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: bool = False,
        **kwargs: Any,
    ) -> dict[str, Any] | Iterator[str]:
        params: dict[str, Any] = dict(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=stream,
            **kwargs,
        )
        if tools:
            params["tools"] = tools
            params["tool_choice"] = "auto"

        if stream:
            return self._stream(params)
        response = self._client.chat.completions.create(**params)
        return _normalise(response)

    def _stream(self, params: dict[str, Any]) -> Iterator[str]:
        with self._client.chat.completions.create(**params) as stream:
            for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    yield delta.content

    # ------------------------------------------------------------------
    # Usage helpers
    # ------------------------------------------------------------------

    def count_tokens(self, text: str) -> int:
        """Rough token estimate (4 chars ≈ 1 token for CJK-heavy GLM output)."""
        try:
            import tiktoken
            enc = tiktoken.get_encoding("cl100k_base")
            return len(enc.encode(text))
        except Exception:
            return max(1, len(text) // 4)


def _normalise(response: Any) -> dict[str, Any]:
    choice = response.choices[0]
    msg = choice.message
    result: dict[str, Any] = {
        "content": msg.content or "",
        "role": "assistant",
        "finish_reason": choice.finish_reason,
        "usage": {
            "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
            "completion_tokens": response.usage.completion_tokens if response.usage else 0,
            "total_tokens": response.usage.total_tokens if response.usage else 0,
        },
    }
    if msg.tool_calls:
        result["tool_calls"] = [
            {
                "id": tc.id,
                "type": "function",
                "function": {"name": tc.function.name, "arguments": tc.function.arguments},
            }
            for tc in msg.tool_calls
        ]
    return result
