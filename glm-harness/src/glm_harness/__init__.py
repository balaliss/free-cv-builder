"""
GLM Harness Builder
===================
Auto-routing infrastructure for GLM models.

Quick start:
    from glm_harness import HarnessBuilder

    harness = HarnessBuilder(api_key="your_zhipu_key")
    resp = harness.chat("Write a Python function to parse JSON safely")
    print(resp.content)
    print(harness.tracker.summary())
"""

from .harness import HarnessBuilder, HarnessResponse
from .router import ClassificationResult, RouteConfig, TaskCategory, TaskRouter
from .tools import ToolRegistry, build_default_registry
from .tracker import CostTracker
from .memory import ConversationMemory

__all__ = [
    "HarnessBuilder",
    "HarnessResponse",
    "TaskRouter",
    "TaskCategory",
    "RouteConfig",
    "ClassificationResult",
    "ToolRegistry",
    "build_default_registry",
    "CostTracker",
    "ConversationMemory",
]

__version__ = "0.1.0"
