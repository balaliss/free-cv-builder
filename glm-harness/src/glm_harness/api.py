"""FastAPI web server — chat UI + routing dashboard."""

from __future__ import annotations

import time
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel

from .harness import HarnessBuilder
from .router import TaskRouter
from .settings import settings
from .tracker import CostTracker

# Global harness instance (initialised at startup)
_harness: HarnessBuilder | None = None
_router = TaskRouter()
_tracker = CostTracker()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    global _harness
    _harness = HarnessBuilder(enable_tools=True)
    yield


app = FastAPI(title="GLM Harness", lifespan=lifespan)


# ------------------------------------------------------------------
# API models
# ------------------------------------------------------------------

class ChatRequest(BaseModel):
    message: str
    stream: bool = False
    reset_memory: bool = False


class ClassifyRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    content: str
    category: str
    confidence: float
    matched_signals: list[str]
    tool_calls_made: list[str]
    prompt_tokens: int
    completion_tokens: int
    actual_cost_usd: float
    baseline_cost_usd: float
    savings_usd: float
    latency_ms: float
    tracker: dict[str, Any]


# ------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------

@app.get("/", response_class=HTMLResponse)
async def index() -> str:
    return _render_ui()


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    if _harness is None:
        raise HTTPException(status_code=503, detail="Harness not initialised")
    if req.reset_memory:
        _harness.reset()

    t0 = time.perf_counter()
    resp = _harness.chat(req.message)
    latency_ms = (time.perf_counter() - t0) * 1000

    return ChatResponse(
        content=resp.content,
        category=resp.category,
        confidence=resp.confidence,
        matched_signals=resp.classification.matched_signals,
        tool_calls_made=resp.tool_calls_made,
        prompt_tokens=resp.usage.prompt_tokens,
        completion_tokens=resp.usage.completion_tokens,
        actual_cost_usd=resp.usage.cost_usd(),
        baseline_cost_usd=resp.usage.cost_usd(_harness.tracker.baseline_model),
        savings_usd=resp.usage.cost_usd(_harness.tracker.baseline_model) - resp.usage.cost_usd(),
        latency_ms=round(latency_ms, 1),
        tracker=_harness.tracker.summary(),
    )


@app.post("/api/stream")
async def stream_chat(req: ChatRequest) -> StreamingResponse:
    if _harness is None:
        raise HTTPException(status_code=503, detail="Harness not initialised")
    if req.reset_memory:
        _harness.reset()

    def generator():
        for chunk in _harness.stream(req.message):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generator(), media_type="text/event-stream")


@app.post("/api/classify")
async def classify(req: ClassifyRequest) -> dict[str, Any]:
    result = _router.classify(req.message)
    return {
        "category": result.category.value,
        "confidence": result.confidence,
        "matched_signals": result.matched_signals,
        "config": {
            "temperature": result.config.temperature,
            "max_tokens": result.config.max_tokens,
            "description": result.config.description,
        },
    }


@app.get("/api/stats")
async def stats() -> dict[str, Any]:
    if _harness is None:
        return {}
    return _harness.tracker.summary()


@app.post("/api/reset")
async def reset_memory() -> dict[str, str]:
    if _harness:
        _harness.reset()
    return {"status": "ok"}


# ------------------------------------------------------------------
# Embedded UI
# ------------------------------------------------------------------

def _render_ui() -> str:
    glm_model = settings.glm_model
    baseline = settings.baseline_model

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>GLM Harness Builder</title>
<style>
  :root {{
    --bg: #0f1117;
    --surface: #1a1d27;
    --surface2: #22263a;
    --border: #2e3247;
    --text: #e2e8f0;
    --muted: #94a3b8;
    --accent: #6366f1;
    --accent2: #818cf8;
    --green: #10b981;
    --yellow: #f59e0b;
    --red: #ef4444;
  }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; height: 100vh; display: flex; flex-direction: column; }}

  header {{ background: var(--surface); border-bottom: 1px solid var(--border); padding: 0.75rem 1.5rem; display: flex; align-items: center; gap: 1rem; }}
  header h1 {{ font-size: 1.1rem; font-weight: 700; color: var(--accent2); }}
  header .model-badge {{ background: var(--accent); color: white; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }}
  header .stats-bar {{ margin-left: auto; display: flex; gap: 1.5rem; font-size: 0.8rem; color: var(--muted); }}
  header .savings {{ color: var(--green); font-weight: 700; }}

  .main {{ display: flex; flex: 1; overflow: hidden; }}

  .chat-panel {{ flex: 1; display: flex; flex-direction: column; }}
  .messages {{ flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }}
  .msg {{ display: flex; gap: 0.75rem; max-width: 85%; }}
  .msg.user {{ align-self: flex-end; flex-direction: row-reverse; }}
  .msg .bubble {{ padding: 0.75rem 1rem; border-radius: 12px; font-size: 0.9rem; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }}
  .msg.user .bubble {{ background: var(--accent); color: white; border-bottom-right-radius: 2px; }}
  .msg.assistant .bubble {{ background: var(--surface); border: 1px solid var(--border); border-bottom-left-radius: 2px; }}
  .msg.system .bubble {{ background: var(--surface2); color: var(--muted); font-size: 0.8rem; font-style: italic; align-self: center; }}
  .avatar {{ width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0; margin-top: 4px; }}
  .msg.user .avatar {{ background: var(--accent); }}
  .msg.assistant .avatar {{ background: var(--surface2); border: 1px solid var(--border); }}

  .input-area {{ padding: 1rem 1.5rem; border-top: 1px solid var(--border); background: var(--surface); display: flex; gap: 0.75rem; }}
  .input-area textarea {{ flex: 1; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 0.75rem 1rem; font-size: 0.9rem; resize: none; outline: none; font-family: inherit; }}
  .input-area textarea:focus {{ border-color: var(--accent); }}
  .input-area button {{ background: var(--accent); color: white; border: none; border-radius: 8px; padding: 0 1.25rem; cursor: pointer; font-weight: 600; font-size: 0.9rem; transition: opacity 0.15s; }}
  .input-area button:hover {{ opacity: 0.85; }}
  .input-area button:disabled {{ opacity: 0.4; cursor: default; }}

  .sidebar {{ width: 320px; border-left: 1px solid var(--border); background: var(--surface); overflow-y: auto; display: flex; flex-direction: column; }}
  .sidebar-section {{ padding: 1rem; border-bottom: 1px solid var(--border); }}
  .sidebar-section h3 {{ font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 0.75rem; }}

  .route-card {{ background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem; }}
  .route-cat {{ font-weight: 700; font-size: 0.9rem; color: var(--accent2); text-transform: capitalize; }}
  .route-desc {{ font-size: 0.8rem; color: var(--muted); margin-top: 0.25rem; }}
  .confidence-bar {{ height: 4px; background: var(--border); border-radius: 2px; margin-top: 0.5rem; }}
  .confidence-fill {{ height: 100%; background: var(--green); border-radius: 2px; transition: width 0.3s; }}
  .route-meta {{ display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap; }}
  .tag {{ background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 0.15rem 0.4rem; font-size: 0.7rem; color: var(--muted); }}

  .cost-row {{ display: flex; justify-content: space-between; font-size: 0.82rem; padding: 0.25rem 0; }}
  .cost-row .label {{ color: var(--muted); }}
  .cost-row .value {{ font-weight: 600; }}
  .cost-row .green {{ color: var(--green); }}
  .savings-big {{ font-size: 1.4rem; font-weight: 800; color: var(--green); text-align: center; padding: 0.5rem 0; }}
  .savings-label {{ font-size: 0.75rem; color: var(--muted); text-align: center; }}

  .signal-chip {{ display: inline-block; background: var(--surface2); border: 1px solid var(--accent); border-radius: 4px; padding: 0.15rem 0.4rem; font-size: 0.7rem; color: var(--accent2); margin: 0.15rem; font-family: monospace; }}

  .latency {{ font-size: 0.75rem; color: var(--muted); text-align: right; margin-top: 0.25rem; }}

  .reset-btn {{ display: block; width: 100%; background: transparent; border: 1px solid var(--border); color: var(--muted); border-radius: 6px; padding: 0.5rem; cursor: pointer; font-size: 0.8rem; margin-top: 0.5rem; transition: all 0.15s; }}
  .reset-btn:hover {{ border-color: var(--red); color: var(--red); }}

  .empty-state {{ color: var(--muted); font-size: 0.82rem; text-align: center; padding: 1rem 0; }}

  @media (max-width: 768px) {{
    .sidebar {{ display: none; }}
  }}
</style>
</head>
<body>
<header>
  <div style="font-size:1.2rem">⚡</div>
  <h1>GLM Harness Builder</h1>
  <span class="model-badge">{glm_model}</span>
  <div class="stats-bar">
    <span>vs <strong>{baseline}</strong></span>
    <span>Saved: <span class="savings" id="hdr-savings">$0.000000</span></span>
    <span id="hdr-pct" style="color:var(--green)">--%</span>
  </div>
</header>

<div class="main">
  <div class="chat-panel">
    <div class="messages" id="messages">
      <div class="msg system"><div class="bubble">GLM harness ready. Type a message — watch the sidebar classify and route your task in real time.</div></div>
    </div>
    <div class="input-area">
      <textarea id="input" rows="2" placeholder="Ask anything... (Shift+Enter for new line, Enter to send)"></textarea>
      <button id="send-btn" onclick="sendMessage()">Send</button>
    </div>
  </div>

  <div class="sidebar">
    <div class="sidebar-section">
      <h3>Task Router</h3>
      <div class="route-card" id="route-card">
        <div class="empty-state">Send a message to see routing</div>
      </div>
    </div>

    <div class="sidebar-section">
      <h3>Signal Detection</h3>
      <div id="signals-area"><div class="empty-state">No signals yet</div></div>
    </div>

    <div class="sidebar-section">
      <h3>Cost Savings</h3>
      <div class="cost-row"><span class="label">This call (GLM)</span><span class="value" id="cost-glm">—</span></div>
      <div class="cost-row"><span class="label">This call ({baseline})</span><span class="value" id="cost-base">—</span></div>
      <div class="savings-big" id="savings-big">$0.00</div>
      <div class="savings-label">Total saved vs {baseline}</div>
      <div class="cost-row" style="margin-top:0.5rem"><span class="label">Total tokens</span><span class="value" id="total-tokens">0</span></div>
      <div class="cost-row"><span class="label">Total calls</span><span class="value" id="total-calls">0</span></div>
    </div>

    <div class="sidebar-section">
      <h3>Session</h3>
      <button class="reset-btn" onclick="resetMemory()">Clear conversation memory</button>
    </div>
  </div>
</div>

<script>
const $ = id => document.getElementById(id);

async function sendMessage() {{
  const input = $('input');
  const msg = input.value.trim();
  if (!msg) return;

  const btn = $('send-btn');
  btn.disabled = true;
  input.value = '';

  appendMsg('user', msg);

  const thinkingId = appendMsg('assistant', '...');

  try {{
    const res = await fetch('/api/chat', {{
      method: 'POST',
      headers: {{ 'Content-Type': 'application/json' }},
      body: JSON.stringify({{ message: msg }})
    }});
    const data = await res.json();

    updateMsg(thinkingId, data.content + (data.tool_calls_made.length ? `\\n\\n🔧 Used tools: ${{data.tool_calls_made.join(', ')}}` : '') + `\\n\\n⏱ ${{data.latency_ms}}ms`);
    updateSidebar(data);
  }} catch(e) {{
    updateMsg(thinkingId, '❌ Error: ' + e.message);
  }}
  btn.disabled = false;
}}

let msgId = 0;
function appendMsg(role, content) {{
  const id = 'msg-' + (++msgId);
  const icon = role === 'user' ? '👤' : '⚡';
  const div = document.createElement('div');
  div.className = `msg ${{role}}`;
  div.id = id;
  div.innerHTML = `<div class="avatar">${{icon}}</div><div class="bubble">${{escHtml(content)}}</div>`;
  $('messages').appendChild(div);
  $('messages').scrollTop = $('messages').scrollHeight;
  return id;
}}

function updateMsg(id, content) {{
  const el = document.getElementById(id);
  if (el) el.querySelector('.bubble').textContent = content;
  $('messages').scrollTop = $('messages').scrollHeight;
}}

function escHtml(s) {{
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\\n/g,'<br>');
}}

function updateSidebar(data) {{
  // Route card
  const pct = Math.round(data.confidence * 100);
  $('route-card').innerHTML = `
    <div class="route-cat">${{data.category}}</div>
    <div class="route-desc">${{getCategoryDesc(data.category)}}</div>
    <div class="confidence-bar"><div class="confidence-fill" style="width:${{pct}}%"></div></div>
    <div style="font-size:0.75rem;color:var(--muted);margin-top:0.3rem">Confidence: ${{pct}}%</div>
  `;

  // Signals
  if (data.matched_signals && data.matched_signals.length) {{
    $('signals-area').innerHTML = data.matched_signals.map(s => `<span class="signal-chip">${{s}}</span>`).join('');
  }} else {{
    $('signals-area').innerHTML = '<div class="empty-state">No strong signals</div>';
  }}

  // Costs
  $('cost-glm').textContent = '$' + data.actual_cost_usd.toFixed(6);
  $('cost-base').textContent = '$' + data.baseline_cost_usd.toFixed(6);

  // Tracker
  const t = data.tracker;
  $('savings-big').textContent = '$' + (t.savings_usd || 0).toFixed(4);
  $('total-tokens').textContent = (t.total_tokens || 0).toLocaleString();
  $('total-calls').textContent = t.total_calls || 0;
  $('hdr-savings').textContent = '$' + (t.savings_usd || 0).toFixed(6);
  $('hdr-pct').textContent = (t.savings_pct || 0).toFixed(1) + '% cheaper';
}}

function getCategoryDesc(cat) {{
  const descs = {{
    coding: 'Low-temperature code generation / debugging',
    copywriting: 'Creative copy, marketing, email drafts',
    summarisation: 'Condensing long documents or transcripts',
    analysis: 'Research, data analysis, structured thinking',
    outline: 'Document and content outlines',
    qa: 'Questions, factual lookup, definitions',
    translation: 'Language translation',
    general: 'Catch-all for uncategorised requests',
  }};
  return descs[cat] || cat;
}}

async function resetMemory() {{
  await fetch('/api/reset', {{ method: 'POST' }});
  $('messages').innerHTML = '<div class="msg system"><div class="bubble">Memory cleared. Fresh conversation started.</div></div>';
}}

$('input').addEventListener('keydown', e => {{
  if (e.key === 'Enter' && !e.shiftKey) {{ e.preventDefault(); sendMessage(); }}
}});
</script>
</body>
</html>"""
