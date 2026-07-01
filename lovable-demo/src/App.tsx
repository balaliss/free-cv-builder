import { useState, useEffect, useCallback } from "react";
import { classify, PRICING, CATEGORY_LABELS } from "./router";
import type { ClassificationResult } from "./router";

const EXAMPLE_PROMPTS = [
  "Write a Python function to reverse a linked list",
  "Summarize this 5,000 word research paper into 5 bullet points",
  "Translate the following paragraph from English to Spanish",
  "Write a compelling email subject line for our Black Friday sale",
  "What is the difference between TCP and UDP?",
  "Create an outline for a 10-chapter book on personal finance",
  "Compare the pros and cons of microservices vs monolithic architecture",
  "Debug this function — it throws a KeyError on line 42",
];

const GLM_MODEL = "glm-4-flash";
const BASELINE = "claude-3-5-sonnet";

function confidenceLabel(c: number) {
  if (c >= 0.8) return "High";
  if (c >= 0.6) return "Medium";
  if (c >= 0.4) return "Low";
  return "—";
}

function costPer1k(tokens: number, model: string) {
  const [inp, out] = PRICING[model] ?? [0, 0];
  // assume 60/40 split for estimation
  return ((tokens * 0.6 * inp + tokens * 0.4 * out) / 1_000_000).toFixed(6);
}

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [prevCategory, setPrevCategory] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const [copied, setCopied] = useState(false);

  const runClassify = useCallback((text: string) => {
    const r = classify(text);
    if (r.category !== prevCategory) {
      setAnimating(true);
      setTimeout(() => setAnimating(false), 300);
    }
    setPrevCategory(r.category);
    setResult(r);
  }, [prevCategory]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (prompt.trim()) runClassify(prompt);
      else setResult(null);
    }, 250);
    return () => clearTimeout(t);
  }, [prompt, runClassify]);

  const cfg = result?.config;
  const glmCost = costPer1k(1000, GLM_MODEL);
  const baseCost = costPer1k(1000, BASELINE);
  const savingsPct = Number(baseCost) === 0 ? 100 : 100;

  const handleCopy = () => {
    const text = `🤖 GLM Harness Task Router Demo\n\nPrompt: "${prompt}"\nClassified as: ${result ? CATEGORY_LABELS[result.category] : "—"}\nConfidence: ${result ? Math.round(result.confidence * 100) : 0}%\nTemperature: ${result?.config.temperature ?? "—"}\nCost vs Claude: 100% cheaper (glm-4-flash is free)\n\nhttps://github.com/balaliss/free-cv-builder/tree/claude/glm-harness-builder-n7dvrk/glm-harness`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100 font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-[#1a1d27] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <h1 className="text-lg font-bold text-indigo-400 leading-tight">
                GLM Harness
              </h1>
              <p className="text-xs text-slate-500">
                Auto-routing infrastructure for open-source LLMs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
              glm-4-flash
            </span>
            <span className="text-slate-600 text-xs">vs</span>
            <span className="bg-slate-700 text-slate-300 text-xs font-medium px-3 py-1 rounded-full">
              Claude 3.5 Sonnet
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT — Input */}
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                Your Prompt
              </label>
              <textarea
                className="w-full h-40 bg-[#1a1d27] border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors resize-none"
                placeholder="Type any prompt to see it classified in real time…"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            {/* Example chips */}
            <div>
              <p className="text-xs text-slate-500 mb-2">Try an example:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPrompt(p)}
                    className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 text-slate-300 rounded-lg px-3 py-1.5 transition-all text-left"
                  >
                    {p.length > 42 ? p.slice(0, 42) + "…" : p}
                  </button>
                ))}
              </div>
            </div>

            {/* Share button */}
            {result && prompt && (
              <button
                onClick={handleCopy}
                className="mt-2 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                {copied ? "✓ Copied for LinkedIn!" : "📋 Copy result for LinkedIn post"}
              </button>
            )}

            {/* Cost comparison */}
            <div className="bg-[#1a1d27] border border-slate-800 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Cost per 1k tokens
              </h3>
              <div className="flex gap-4">
                <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                  <div className="text-emerald-400 font-bold text-xl">${glmCost}</div>
                  <div className="text-slate-400 text-xs mt-0.5">glm-4-flash</div>
                  <div className="text-emerald-500 text-xs font-semibold mt-1">FREE</div>
                </div>
                <div className="flex items-center text-slate-600 text-sm font-bold">vs</div>
                <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-center">
                  <div className="text-slate-300 font-bold text-xl">${baseCost}</div>
                  <div className="text-slate-400 text-xs mt-0.5">Claude 3.5</div>
                  <div className="text-slate-500 text-xs font-semibold mt-1">avg blended</div>
                </div>
              </div>
              <div className="mt-3 text-center">
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 text-sm font-bold px-4 py-1.5 rounded-full border border-emerald-500/20">
                  💰 {savingsPct}% cheaper
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT — Results */}
          <div className="flex flex-col gap-4">
            {!result ? (
              <div className="flex-1 flex items-center justify-center bg-[#1a1d27] border border-slate-800 rounded-xl p-8">
                <div className="text-center">
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="text-slate-500 text-sm">
                    Type a prompt to see the router in action
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Classification card */}
                <div
                  className={`bg-[#1a1d27] border rounded-xl p-4 transition-all duration-300 ${cfg?.borderColor ?? "border-slate-800"} ${animating ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                      Task Classification
                    </h3>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg?.bgColor} ${cfg?.color} border ${cfg?.borderColor}`}
                    >
                      {confidenceLabel(result.confidence)} confidence
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className={`text-2xl font-bold capitalize ${cfg?.color}`}
                    >
                      {CATEGORY_LABELS[result.category]}
                    </span>
                    <span className="text-slate-500 text-sm">
                      {Math.round(result.confidence * 100)}%
                    </span>
                  </div>

                  {/* Confidence bar */}
                  <div className="h-1.5 bg-slate-800 rounded-full mb-4 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${result.confidence * 100}%` }}
                    />
                  </div>

                  {/* Matched signals */}
                  {result.matchedSignals.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-500 mb-2">
                        Matched signals:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.matchedSignals.map((s) => (
                          <code
                            key={s}
                            className={`text-xs px-2 py-0.5 rounded border font-mono ${cfg?.bgColor} ${cfg?.color} ${cfg?.borderColor}`}
                          >
                            {s.replace(/\\b/g, "").replace(/\\/g, "")}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Route config card */}
                <div className="bg-[#1a1d27] border border-slate-800 rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                    Route Configuration
                  </h3>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-xs text-slate-500 mb-1">Temperature</div>
                      <div className="text-lg font-bold text-slate-100">
                        {cfg?.temperature}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {(cfg?.temperature ?? 0) <= 0.3
                          ? "precise / deterministic"
                          : (cfg?.temperature ?? 0) >= 0.75
                          ? "creative / varied"
                          : "balanced"}
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-xs text-slate-500 mb-1">Max tokens</div>
                      <div className="text-lg font-bold text-slate-100">
                        {cfg?.maxTokens?.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">output budget</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 italic">{cfg?.description}</p>
                </div>

                {/* System prompt preview */}
                <div className="bg-[#1a1d27] border border-slate-800 rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                    Injected System Prompt
                  </h3>
                  <div className="bg-[#0f1117] border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-400 leading-relaxed">
                    {cfg?.systemPrompt}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-600">
          <span>Built with GLM Harness Builder — open-source auto-routing for LLMs</span>
          <a
            href="https://github.com/balaliss/free-cv-builder/tree/claude/glm-harness-builder-n7dvrk/glm-harness"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View source on GitHub →
          </a>
        </div>
      </main>
    </div>
  );
}
