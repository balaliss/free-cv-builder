"""
Example: Using the GLM harness with custom tools.
"""

import os
import json
from glm_harness import HarnessBuilder
from glm_harness.tools import ToolRegistry

# Build a custom tool registry
registry = ToolRegistry()

@registry.register(
    name="get_stock_price",
    description="Get the current stock price for a ticker symbol (simulated).",
    parameters={
        "type": "object",
        "properties": {
            "ticker": {"type": "string", "description": "Stock ticker symbol, e.g. AAPL"},
        },
        "required": ["ticker"],
    },
)
def get_stock_price(ticker: str) -> dict:
    # Simulated prices — replace with a real API
    prices = {"AAPL": 189.25, "GOOGL": 178.50, "MSFT": 415.80, "NVDA": 875.40}
    price = prices.get(ticker.upper(), 42.00)
    return {"ticker": ticker.upper(), "price": price, "currency": "USD"}


harness = HarnessBuilder(
    api_key=os.getenv("GLM_API_KEY"),
    tool_registry=registry,
)

response = harness.chat(
    "What's the current price of Apple stock, and how much would 10 shares cost?"
)

print(f"Category: {response.category}")
print(f"Tools called: {response.tool_calls_made}")
print(f"\nResponse:\n{response.content}")
