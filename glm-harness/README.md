# GLM Harness Builder

> **Auto-routing infrastructure for GLM models — drop frontier LLMs at up to 98% lower cost.**

Inspired by the insight from *"GLM 5.2 Is Free And Beats Claude On Most Work"*: a model alone is a "brain in a jar." This harness provides the infrastructure layer that makes open-source models production-ready — task routing, system prompt management, tool calls, conversation memory, and cost tracking.

---

## What it does

```
Your prompt → [Task Router] → [System Prompt Selection] → [GLM API] → Response
                    ↓
              Coding? → temp=0.2, coding system prompt
              Copywriting? → temp=0.85, copywriting prompt
              Summarisation? → temp=0.3, summarisation prompt
              ...8 task categories total
```

**Key components:**

| Component | What it does |
|-----------|-------------|
| `TaskRouter` | Classifies any prompt into 8 categories using heuristic signal matching |
| `HarnessBuilder` | Orchestrates routing → prompts → memory → tools → response |
| `ConversationMemory` | Sliding-window memory with automatic compaction and summarisation |
| `ToolRegistry` | Register Python functions as LLM-callable tools (OpenAI format) |
| `CostTracker` | Tracks real cost vs baseline model (Claude/GPT-4) — shows savings |
| Web UI | FastAPI dashboard with real-time routing visualisation |
| CLI | `glm chat`, `glm classify`, `glm serve` |

---

## Quickstart

### 1. Get a free GLM API key

Sign up at [open.bigmodel.cn](https://open.bigmodel.cn/) — the `glm-4-flash` model is **free**.

### 2. Install

```bash
cd glm-harness
pip install -e ".[dev]"
cp .env.example .env
# Edit .env and add your GLM_API_KEY
```

### 3. Use the Python API

```python
from glm_harness import HarnessBuilder

harness = HarnessBuilder(api_key="your_key")

# Automatically routed to coding config (temp=0.2, coding system prompt)
resp = harness.chat("Write a Python function to validate an email address")
print(resp.content)
print(f"Category: {resp.category}")        # → "coding"
print(f"Confidence: {resp.confidence:.0%}")  # → "85%"
print(harness.tracker.summary())
```

### 4. CLI

```bash
# Interactive chat
glm chat --api-key YOUR_KEY

# Classify a prompt without calling the API
glm classify "Write a blog post about climate change"
# → Category: copywriting | Confidence: 80% | Temp: 0.85

# Web UI + API server
glm serve
# → http://localhost:8000
```

### 5. Web UI

```bash
glm serve
```

Open `http://localhost:8000` — you get a chat interface with a live sidebar showing:
- Task classification + confidence bar
- Matched keyword signals
- Per-call and cumulative cost vs Claude/GPT-4

---

## Task categories

| Category | Temperature | When it's used |
|----------|-------------|----------------|
| `coding` | 0.2 | Code generation, debugging, refactoring |
| `copywriting` | 0.85 | Blog posts, emails, ad copy, captions |
| `summarisation` | 0.3 | TL;DR, condensing documents |
| `analysis` | 0.4 | Research, comparisons, structured thinking |
| `outline` | 0.6 | Document structure, table of contents |
| `qa` | 0.5 | Questions, definitions, factual lookups |
| `translation` | 0.2 | Language translation |
| `general` | 0.7 | Everything else |

---

## Custom tools

```python
from glm_harness import HarnessBuilder
from glm_harness.tools import ToolRegistry

registry = ToolRegistry()

@registry.register(
    name="get_weather",
    description="Get current weather for a city",
    parameters={
        "type": "object",
        "properties": {"city": {"type": "string"}},
        "required": ["city"],
    },
)
def get_weather(city: str) -> dict:
    return {"city": city, "temp_c": 22, "condition": "sunny"}  # replace with real API

harness = HarnessBuilder(tool_registry=registry)
resp = harness.chat("What's the weather in Paris right now?")
```

---

## Cost comparison

With `glm-4-flash` (free) vs Claude 3.5 Sonnet ($3/$15 per M tokens):

| Session | GLM cost | Claude cost | Saved |
|---------|----------|-------------|-------|
| 1M tokens | $0.00 | $10.50 avg | **100%** |
| 10M tokens | $0.00 | $105.00 avg | **100%** |

Even the paid `glm-4` model ($1/$1 per M) saves ~85% vs Claude Sonnet.

---

## Running tests

```bash
pip install -e ".[dev]"
pytest tests/ -v
```

All tests run without an API key — the router, memory, tracker, and tool tests are fully offline.

---

## Architecture

```
glm-harness/
├── src/glm_harness/
│   ├── harness.py      ← HarnessBuilder orchestrator
│   ├── client.py       ← Zhipu AI (OpenAI-compatible) API client
│   ├── router.py       ← Task auto-router (8 categories)
│   ├── prompts.py      ← System prompt templates per category
│   ├── memory.py       ← Sliding-window conversation memory
│   ├── tools.py        ← Tool call registry + built-in tools
│   ├── tracker.py      ← Cost tracker vs baseline model
│   ├── api.py          ← FastAPI web server + embedded UI
│   ├── cli.py          ← Typer CLI
│   └── settings.py     ← Pydantic settings from .env
├── examples/
├── tests/
└── pyproject.toml
```

## Supported models

Any model from [Zhipu AI](https://open.bigmodel.cn/) works. Set `GLM_MODEL` in `.env`:

- `glm-4-flash` — **free**, fast, great for most tasks
- `glm-4` — paid, higher quality
- `glm-4-plus` — paid, best quality
- `glm-4-long` — 128k context window
- `glm-z1-flash` — free reasoning model

The harness also works with any other OpenAI-compatible endpoint — set `GLM_BASE_URL` to point at a self-hosted instance.
