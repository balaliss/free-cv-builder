"""Tool-call infrastructure for the GLM harness."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Callable


@dataclass
class Tool:
    name: str
    description: str
    parameters: dict[str, Any]
    handler: Callable[..., Any]

    def to_openai_spec(self) -> dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }


class ToolRegistry:
    """Register Python callables as LLM-callable tools."""

    def __init__(self) -> None:
        self._tools: dict[str, Tool] = {}

    def register(
        self,
        name: str,
        description: str,
        parameters: dict[str, Any],
    ) -> Callable:
        """Decorator that registers a function as a tool."""
        def decorator(fn: Callable) -> Callable:
            self._tools[name] = Tool(
                name=name,
                description=description,
                parameters=parameters,
                handler=fn,
            )
            return fn
        return decorator

    def specs(self) -> list[dict[str, Any]]:
        return [t.to_openai_spec() for t in self._tools.values()]

    def call(self, name: str, arguments: str | dict[str, Any]) -> str:
        tool = self._tools.get(name)
        if not tool:
            return json.dumps({"error": f"Unknown tool: {name}"})
        try:
            args = json.loads(arguments) if isinstance(arguments, str) else arguments
            result = tool.handler(**args)
            return json.dumps(result) if not isinstance(result, str) else result
        except Exception as exc:
            return json.dumps({"error": str(exc)})

    def __len__(self) -> int:
        return len(self._tools)


# ------------------------------------------------------------------
# Built-in utility tools
# ------------------------------------------------------------------

def build_default_registry() -> ToolRegistry:
    registry = ToolRegistry()

    @registry.register(
        name="get_current_datetime",
        description="Returns the current UTC date and time.",
        parameters={"type": "object", "properties": {}, "required": []},
    )
    def get_current_datetime() -> str:
        from datetime import datetime, timezone
        return datetime.now(timezone.utc).isoformat()

    @registry.register(
        name="calculate",
        description="Evaluate a safe mathematical expression and return the result.",
        parameters={
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "A Python-compatible math expression, e.g. '2 ** 10 + 3 * 7'",
                }
            },
            "required": ["expression"],
        },
    )
    def calculate(expression: str) -> dict[str, Any]:
        import ast
        import operator as op

        allowed_ops = {
            ast.Add: op.add, ast.Sub: op.sub, ast.Mult: op.mul,
            ast.Div: op.truediv, ast.Pow: op.pow, ast.Mod: op.mod,
            ast.USub: op.neg, ast.UAdd: op.pos,
        }

        def _eval(node: ast.AST) -> float:
            match node:
                case ast.Constant(value=v) if isinstance(v, (int, float)):
                    return v
                case ast.BinOp(left=l, op=o, right=r):
                    op_fn = allowed_ops.get(type(o))
                    if op_fn is None:
                        raise ValueError(f"Unsupported operator: {type(o)}")
                    return op_fn(_eval(l), _eval(r))
                case ast.UnaryOp(op=o, operand=v):
                    op_fn = allowed_ops.get(type(o))
                    if op_fn is None:
                        raise ValueError(f"Unsupported operator: {type(o)}")
                    return op_fn(_eval(v))
                case _:
                    raise ValueError(f"Unsupported node: {type(node)}")

        tree = ast.parse(expression, mode="eval")
        result = _eval(tree.body)
        return {"expression": expression, "result": result}

    return registry
