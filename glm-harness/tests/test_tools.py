"""Tests for tool registry and built-in tools."""

import json
from glm_harness.tools import ToolRegistry, build_default_registry


def test_register_and_call():
    registry = ToolRegistry()

    @registry.register(
        name="add",
        description="Add two numbers",
        parameters={
            "type": "object",
            "properties": {
                "a": {"type": "number"},
                "b": {"type": "number"},
            },
            "required": ["a", "b"],
        },
    )
    def add(a: float, b: float) -> float:
        return a + b

    result = registry.call("add", json.dumps({"a": 3, "b": 4}))
    assert json.loads(result) == 7.0


def test_unknown_tool_returns_error():
    registry = ToolRegistry()
    result = json.loads(registry.call("nonexistent", "{}"))
    assert "error" in result


def test_default_registry_has_tools():
    registry = build_default_registry()
    assert len(registry) >= 2


def test_calculate_tool():
    registry = build_default_registry()
    result = json.loads(registry.call("calculate", json.dumps({"expression": "2 ** 10"})))
    assert result["result"] == 1024.0


def test_calculate_rejects_exec():
    registry = build_default_registry()
    result = json.loads(registry.call("calculate", json.dumps({"expression": "__import__('os').system('ls')"})))
    assert "error" in result


def test_specs_format():
    registry = build_default_registry()
    specs = registry.specs()
    assert all(s["type"] == "function" for s in specs)
    assert all("name" in s["function"] for s in specs)
