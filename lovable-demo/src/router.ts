export type TaskCategory =
  | "coding"
  | "copywriting"
  | "summarisation"
  | "analysis"
  | "outline"
  | "qa"
  | "translation"
  | "general";

export interface RouteConfig {
  temperature: number;
  maxTokens: number;
  description: string;
  systemPrompt: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export interface ClassificationResult {
  category: TaskCategory;
  confidence: number;
  matchedSignals: string[];
  config: RouteConfig;
}

const ROUTE_TABLE: Record<TaskCategory, RouteConfig> = {
  coding: {
    temperature: 0.2,
    maxTokens: 8192,
    description: "Low-temperature code generation and debugging",
    systemPrompt:
      "You are an expert software engineer. Use idiomatic patterns, add comments only where logic is non-obvious, prefer readability over cleverness, and include brief usage examples when helpful.",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
  copywriting: {
    temperature: 0.85,
    maxTokens: 2048,
    description: "Creative copy, marketing emails, ad content",
    systemPrompt:
      "You are a seasoned copywriter. Write in a clear, engaging voice. Lead with value, use active voice, and end with a compelling close. Default to professional-but-warm tone.",
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
  },
  summarisation: {
    temperature: 0.3,
    maxTokens: 1024,
    description: "Condensing long documents or transcripts",
    systemPrompt:
      "You are a precise summariser. Extract the most important information. Preserve key numbers, names, and conclusions. Do not add interpretation unless explicitly asked.",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
  },
  analysis: {
    temperature: 0.4,
    maxTokens: 4096,
    description: "Research, comparisons, structured thinking",
    systemPrompt:
      "You are a rigorous analytical thinker. Structure responses with clear sections. Distinguish facts from inferences. Surface trade-offs and uncertainties explicitly.",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
  },
  outline: {
    temperature: 0.6,
    maxTokens: 2048,
    description: "Document structure and content outlines",
    systemPrompt:
      "You are an expert document architect. Create clear, logical hierarchical outlines with numbered headings and descriptive subheadings. Each section should be self-contained.",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
  },
  qa: {
    temperature: 0.5,
    maxTokens: 1024,
    description: "Questions, definitions, factual lookups",
    systemPrompt:
      "You are a knowledgeable and accurate assistant. Answer questions directly and concisely. If uncertain, say so. Cite reasoning when the answer is non-obvious.",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
  },
  translation: {
    temperature: 0.2,
    maxTokens: 4096,
    description: "Language translation with cultural nuance",
    systemPrompt:
      "You are a professional translator with deep cultural knowledge. Translate accurately while preserving tone, register, and intent. Flag culturally untranslatable terms if needed.",
    color: "text-rose-400",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/30",
  },
  general: {
    temperature: 0.7,
    maxTokens: 4096,
    description: "Catch-all for uncategorised requests",
    systemPrompt:
      "You are a helpful, concise, and accurate AI assistant. Give clear answers without unnecessary preamble.",
    color: "text-slate-400",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500/30",
  },
};

// Signal patterns per category (order = priority)
const SIGNALS: Array<[TaskCategory, RegExp[]]> = [
  [
    "coding",
    [
      /\bcode\b/,
      /\bfunction\b/,
      /\bclass\b/,
      /\bscript\b/,
      /\bbug\b/,
      /\bdebug\b/,
      /\brefactor\b/,
      /\bapi\b/,
      /\bsql\b/,
      /\bpython\b/,
      /\bjavascript\b/,
      /\btypescript\b/,
      /\brust\b/,
      /\bjava\b/,
      /\balgorithm\b/,
      /\bunit test\b/,
      /\bcompile\b/,
      /\berror\b.*\bline\b/,
      /```/,
    ],
  ],
  [
    "translation",
    [
      /\btranslat/,
      /\bin (french|spanish|german|chinese|japanese|arabic|hindi|portuguese)\b/,
      /\bto (french|spanish|german|chinese|japanese|arabic|hindi|portuguese)\b/,
    ],
  ],
  [
    "summarisation",
    [
      /\bsummariz/,
      /\bsummaris/,
      /\btldr\b/,
      /\btl;dr\b/,
      /\bcondense\b/,
      /\bshorten\b/,
      /\bkey (points|takeaways)\b/,
    ],
  ],
  [
    "outline",
    [
      /\boutline\b/,
      /\btable of contents\b/,
      /\bheadings\b/,
      /\bbullet points?\b/,
      /\bplan (a|an|the)\b/,
    ],
  ],
  [
    "copywriting",
    [
      /\b(write|draft|create)\b.{0,40}\b(blog|article|post|email|newsletter|ad|caption|tweet|bio|landing page)\b/,
      /\bsubject line\b/,
      /\bmarketing\b/,
      /\bheadline\b/,
      /\bpitch\b/,
      /\bslogan\b/,
      /\bproduct description\b/,
      /\bbrand voice\b/,
      /\bcall[ -]to[ -]action\b/,
    ],
  ],
  [
    "analysis",
    [
      /\banalyz/,
      /\banalysi/,
      /\bcompare\b/,
      /\bpros and cons\b/,
      /\bevaluate\b/,
      /\bassess\b/,
      /\bresearch\b/,
      /\btrend\b/,
      /\binsight\b/,
    ],
  ],
  [
    "qa",
    [
      /^(what|who|where|when|why|how|is|are|can|does|do|did|will|would|should)\b/,
      /\bexplain\b/,
      /\bdefinition\b/,
      /\bwhat is\b/,
      /\bwhat are\b/,
    ],
  ],
];

export function classify(prompt: string): ClassificationResult {
  const text = prompt.toLowerCase().trim();

  if (!text) {
    return {
      category: "general",
      confidence: 0,
      matchedSignals: [],
      config: ROUTE_TABLE["general"],
    };
  }

  const scores: Map<TaskCategory, { count: number; signals: string[] }> =
    new Map();

  for (const [category, patterns] of SIGNALS) {
    const hits = patterns.filter((p) => p.test(text));
    if (hits.length > 0) {
      scores.set(category, {
        count: hits.length,
        signals: hits.map((p) => p.source).slice(0, 5),
      });
    }
  }

  if (scores.size === 0) {
    return {
      category: "general",
      confidence: 0.5,
      matchedSignals: [],
      config: ROUTE_TABLE["general"],
    };
  }

  let bestCategory: TaskCategory = "general";
  let bestCount = 0;

  for (const [cat, { count }] of scores) {
    if (count > bestCount) {
      bestCount = count;
      bestCategory = cat;
    }
  }

  const { count, signals } = scores.get(bestCategory)!;
  const totalPatterns = SIGNALS.find(([c]) => c === bestCategory)![1].length;
  const confidence = Math.min(0.95, 0.4 + (count / totalPatterns) * 0.55);

  return {
    category: bestCategory,
    confidence,
    matchedSignals: signals,
    config: ROUTE_TABLE[bestCategory],
  };
}

// Pricing per 1M tokens [input, output] in USD
export const PRICING: Record<string, [number, number]> = {
  "glm-4-flash": [0, 0],
  "glm-4": [1, 1],
  "claude-3-5-sonnet": [3, 15],
  "gpt-4o": [5, 15],
  "gpt-4-turbo": [10, 30],
};

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  coding: "Coding",
  copywriting: "Copywriting",
  summarisation: "Summarisation",
  analysis: "Analysis",
  outline: "Outline",
  qa: "Q&A",
  translation: "Translation",
  general: "General",
};
