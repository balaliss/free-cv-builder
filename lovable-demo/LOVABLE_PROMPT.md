# Lovable Prompt — GLM Harness Task Router Demo

Paste the text below (between the triple dashes) directly into Lovable as your initial prompt.
Lovable will generate the full app. Then replace the generated `src/App.tsx` and add
`src/router.ts` from this folder for the exact implementation.

---

Build a dark-themed interactive single-page React + Tailwind CSS app called **"GLM Harness — Task Router Demo"**.

## Purpose
Showcase an AI task auto-router that classifies any prompt into one of 8 categories
(coding, copywriting, summarisation, analysis, outline, qa, translation, general)
and shows what model configuration and system prompt would be applied — all in real time
in the browser, no API key required.

## Layout
Two-column layout on desktop, stacked on mobile. Background color `#0f1117` throughout.

### Header
- Dark header (`#1a1d27` bg, bottom border `#1e2235`)
- Left: ⚡ icon, title "GLM Harness" in indigo-400, subtitle "Auto-routing infrastructure for open-source LLMs" in slate-500
- Right: pill badge "glm-4-flash" in indigo-600, "vs" text, pill "Claude 3.5 Sonnet" in slate-700

### Left column — Input
1. **Textarea** (h-40): placeholder "Type any prompt to see it classified in real time…", dark bg, indigo border on focus, real-time classification with 250ms debounce
2. **Example prompt chips** (8 chips, wrap): clicking fills the textarea
   - "Write a Python function to reverse a linked list"
   - "Summarize this 5,000 word research paper into 5 bullet points"
   - "Translate the following paragraph from English to Spanish"
   - "Write a compelling email subject line for our Black Friday sale"
   - "What is the difference between TCP and UDP?"
   - "Create an outline for a 10-chapter book on personal finance"
   - "Compare the pros and cons of microservices vs monolithic architecture"
   - "Debug this function — it throws a KeyError on line 42"
3. **Copy for LinkedIn button** (indigo, full width): copies a formatted LinkedIn post about the result to clipboard. Only visible when there is a classified result.
4. **Cost comparison card**: two boxes side by side. Left box (emerald tint): "glm-4-flash", "$0.000000", "FREE". Right box (slate): "Claude 3.5", "$0.007500" (avg blended per 1k tokens), "avg blended". Below both: a green pill showing "💰 100% cheaper".

### Right column — Results
Show a placeholder state (magnifying glass emoji + "Type a prompt to see the router in action") when no prompt is entered.

When a prompt is classified, show 3 cards with a smooth fade+scale-in animation on category change:

**Card 1 — Task Classification**
- Header row: "Task Classification" label + confidence level pill (High/Medium/Low) colored to match category
- Category name large and bold, colored to match category, + percentage number
- Animated green progress bar showing confidence (0–95%)
- Matched keyword signals as monospace code chips colored to match category

**Card 2 — Route Configuration**
- Two stat boxes: Temperature (with label "precise/deterministic" ≤0.3, "balanced" 0.4–0.7, "creative/varied" ≥0.75) and Max Tokens
- Short description of the route in italic slate text

**Card 3 — Injected System Prompt**
- Monospace code block on dark background showing the exact system prompt that would be injected

### Footer
Left: "Built with GLM Harness Builder — open-source auto-routing for LLMs"
Right: "View source on GitHub →" link (indigo, external)

## Category colors (use consistently for all colored elements per category)
- coding → blue-400 / blue-500/10 bg / blue-500/30 border
- copywriting → violet-400 / violet-500/10 / violet-500/30
- summarisation → amber-400 / amber-500/10 / amber-500/30
- analysis → cyan-400 / cyan-500/10 / cyan-500/30
- outline → emerald-400 / emerald-500/10 / emerald-500/30
- qa → orange-400 / orange-500/10 / orange-500/30
- translation → rose-400 / rose-500/10 / rose-500/30
- general → slate-400 / slate-500/10 / slate-500/30

## Classification logic (implement in TypeScript, client-side only)
Classify the lowercased prompt against these keyword patterns.
Score each category by number of pattern hits. Highest score wins.
Confidence = min(0.95, 0.4 + hits/totalPatterns * 0.55).

Patterns:
- coding: \bcode\b, \bfunction\b, \bclass\b, \bscript\b, \bbug\b, \bdebug\b, \brefactor\b, \bapi\b, \bsql\b, \bpython\b, \bjavascript\b, \btypescript\b, \brust\b, \bjava\b, \balgorithm\b, \bunit test\b, \bcompile\b, \berror\b.*\bline\b, ```
- translation: \btranslat, \bin (french|spanish|german|chinese|japanese|arabic|hindi|portuguese)\b, \bto (french|spanish|...)\b
- summarisation: \bsummariz, \bsummaris, \btldr\b, \btl;dr\b, \bcondense\b, \bshorten\b, \bkey (points|takeaways)\b
- outline: \boutline\b, \btable of contents\b, \bheadings\b, \bbullet points?\b, \bplan (a|an|the)\b
- copywriting: \b(write|draft|create)\b.{0,40}\b(blog|article|post|email|newsletter|ad|caption|tweet|bio|landing page)\b, \bsubject line\b, \bmarketing\b, \bheadline\b, \bpitch\b, \bslogan\b, \bproduct description\b, \bbrand voice\b
- analysis: \banalyz, \banalysi, \bcompare\b, \bpros and cons\b, \bevaluate\b, \bassess\b, \bresearch\b, \btrend\b, \binsight\b
- qa: ^(what|who|where|when|why|how|is|are|can|does|do|did|will|would|should)\b, \bexplain\b, \bdefinition\b, \bwhat is\b, \bwhat are\b
- general: fallback if no hits

System prompts per category:
- coding: "You are an expert software engineer. Use idiomatic patterns, add comments only where logic is non-obvious, prefer readability over cleverness, and include brief usage examples when helpful."
- copywriting: "You are a seasoned copywriter. Write in a clear, engaging voice. Lead with value, use active voice, and end with a compelling close. Default to professional-but-warm tone."
- summarisation: "You are a precise summariser. Extract the most important information. Preserve key numbers, names, and conclusions. Do not add interpretation unless explicitly asked."
- analysis: "You are a rigorous analytical thinker. Structure responses with clear sections. Distinguish facts from inferences. Surface trade-offs and uncertainties explicitly."
- outline: "You are an expert document architect. Create clear, logical hierarchical outlines with numbered headings. Each section should be self-contained."
- qa: "You are a knowledgeable and accurate assistant. Answer questions directly and concisely. Cite reasoning when the answer is non-obvious."
- translation: "You are a professional translator with deep cultural knowledge. Translate accurately while preserving tone, register, and intent."
- general: "You are a helpful, concise, and accurate AI assistant. Give clear answers without unnecessary preamble."

---

## After Lovable generates the app

1. Open the Lovable editor and go to **Files**
2. Replace the contents of `src/App.tsx` with the file from this repo: `lovable-demo/src/App.tsx`
3. Create a new file `src/router.ts` and paste the contents of `lovable-demo/src/router.ts`
4. Click **Publish** — Lovable gives you a public URL
5. On LinkedIn: go to your profile → **Add profile section → Featured → Add a link** → paste the Lovable URL

## Connecting to LinkedIn via the Lovable integration

The Lovable connector on LinkedIn showcases apps you've shipped through Lovable.
Once you publish the app on Lovable:
- Your Lovable profile page will list it
- LinkedIn reads your Lovable projects and displays them as portfolio items under your Featured section automatically (via the connected app you already set up)
