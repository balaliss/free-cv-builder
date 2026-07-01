"""Task auto-router — classifies prompts and selects the right harness config."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum


class TaskCategory(str, Enum):
    CODING = "coding"
    COPYWRITING = "copywriting"
    SUMMARISATION = "summarisation"
    ANALYSIS = "analysis"
    OUTLINE = "outline"
    QA = "qa"
    TRANSLATION = "translation"
    GENERAL = "general"


# -------------------------------------------------------------------------
# Per-category routing config
# -------------------------------------------------------------------------

@dataclass
class RouteConfig:
    category: TaskCategory
    temperature: float = 0.7
    max_tokens: int = 4096
    system_prompt_key: str = "default"
    description: str = ""


ROUTE_TABLE: dict[TaskCategory, RouteConfig] = {
    TaskCategory.CODING: RouteConfig(
        category=TaskCategory.CODING,
        temperature=0.2,
        max_tokens=8192,
        system_prompt_key="coding",
        description="Low-temperature code generation / debugging",
    ),
    TaskCategory.COPYWRITING: RouteConfig(
        category=TaskCategory.COPYWRITING,
        temperature=0.85,
        max_tokens=2048,
        system_prompt_key="copywriting",
        description="Creative copy, marketing, email drafts",
    ),
    TaskCategory.SUMMARISATION: RouteConfig(
        category=TaskCategory.SUMMARISATION,
        temperature=0.3,
        max_tokens=1024,
        system_prompt_key="summarisation",
        description="Condensing long documents or transcripts",
    ),
    TaskCategory.ANALYSIS: RouteConfig(
        category=TaskCategory.ANALYSIS,
        temperature=0.4,
        max_tokens=4096,
        system_prompt_key="analysis",
        description="Research, data analysis, structured thinking",
    ),
    TaskCategory.OUTLINE: RouteConfig(
        category=TaskCategory.OUTLINE,
        temperature=0.6,
        max_tokens=2048,
        system_prompt_key="outline",
        description="Document and content outlines",
    ),
    TaskCategory.QA: RouteConfig(
        category=TaskCategory.QA,
        temperature=0.5,
        max_tokens=1024,
        system_prompt_key="qa",
        description="Questions, factual lookup, definitions",
    ),
    TaskCategory.TRANSLATION: RouteConfig(
        category=TaskCategory.TRANSLATION,
        temperature=0.2,
        max_tokens=4096,
        system_prompt_key="translation",
        description="Language translation",
    ),
    TaskCategory.GENERAL: RouteConfig(
        category=TaskCategory.GENERAL,
        temperature=0.7,
        max_tokens=4096,
        system_prompt_key="default",
        description="Catch-all for uncategorised requests",
    ),
}


# -------------------------------------------------------------------------
# Keyword signals per category  (order matters — first match wins)
# -------------------------------------------------------------------------

_SIGNALS: list[tuple[TaskCategory, list[str]]] = [
    (TaskCategory.CODING, [
        r"\bcode\b", r"\bfunction\b", r"\bclass\b", r"\bscript\b", r"\bbug\b",
        r"\bdebug\b", r"\brefactor\b", r"\bapi\b", r"\bsql\b", r"\bpython\b",
        r"\bjavascript\b", r"\btypescript\b", r"\brust\b", r"\bgo\b", r"\bjava\b",
        r"\bimplementing\b", r"\bunit test\b", r"\balgorithm\b", r"\bcompile\b",
        r"\berror\b.*\bline\b", r"```",
    ]),
    (TaskCategory.TRANSLATION, [
        r"\btranslat", r"\bin (french|spanish|german|chinese|japanese|arabic|hindi|portuguese)\b",
        r"\bto (french|spanish|german|chinese|japanese|arabic|hindi|portuguese)\b",
    ]),
    (TaskCategory.SUMMARISATION, [
        r"\bsummariz", r"\bsummaris", r"\btldr\b", r"\btl;dr\b", r"\bcondense\b",
        r"\bshorten\b", r"\bin (brief|short)\b", r"\bkey (points|takeaways)\b",
    ]),
    (TaskCategory.OUTLINE, [
        r"\boutline\b", r"\bstructure\b", r"\btable of contents\b", r"\bheadings\b",
        r"\bplan (a|an|the)\b", r"\bbullet points?\b",
    ]),
    (TaskCategory.COPYWRITING, [
        r"\b(write|draft|create)\b.{0,40}\b(blog|article|post|email|newsletter|ad|caption|tweet|bio|landing page)\b",
        r"\bsubject line\b", r"\bcopy\b", r"\bmarketing\b", r"\bheadline\b",
        r"\bpitch\b", r"\bslogan\b", r"\bcall[ -]to[ -]action\b",
        r"\bproduct description\b", r"\bbrand voice\b",
    ]),
    (TaskCategory.ANALYSIS, [
        r"\banalyz", r"\banalysi", r"\bcompare\b", r"\bpros and cons\b",
        r"\bevaluate\b", r"\bassess\b", r"\breview\b", r"\bresearch\b",
        r"\btrend\b", r"\binsight\b", r"\bdata\b",
    ]),
    (TaskCategory.QA, [
        r"^(what|who|where|when|why|how|is|are|can|does|do|did|will|would|should)\b",
        r"\bexplain\b", r"\bdefinition\b", r"\bwhat is\b", r"\bwhat are\b",
        r"\bfaq\b",
    ]),
]


@dataclass
class ClassificationResult:
    category: TaskCategory
    confidence: float  # 0-1
    matched_signals: list[str] = field(default_factory=list)
    config: RouteConfig = field(init=False)

    def __post_init__(self) -> None:
        self.config = ROUTE_TABLE[self.category]


class TaskRouter:
    """Heuristic task classifier with optional LLM fallback."""

    def classify(self, prompt: str) -> ClassificationResult:
        text = prompt.lower()
        scores: dict[TaskCategory, tuple[int, list[str]]] = {}

        for category, patterns in _SIGNALS:
            hits = [p for p in patterns if re.search(p, text)]
            if hits:
                scores[category] = (len(hits), hits)

        if not scores:
            return ClassificationResult(
                category=TaskCategory.GENERAL,
                confidence=0.5,
            )

        best_cat = max(scores, key=lambda c: scores[c][0])
        hit_count, matched = scores[best_cat]
        total_patterns = len(dict(_SIGNALS)[best_cat])
        confidence = min(0.95, 0.4 + (hit_count / total_patterns) * 0.55)

        return ClassificationResult(
            category=best_cat,
            confidence=confidence,
            matched_signals=matched[:5],
        )

    def route(self, prompt: str) -> RouteConfig:
        return self.classify(prompt).config
