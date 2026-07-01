"""Cost tracking and savings comparison."""

from __future__ import annotations

from dataclasses import dataclass, field

from .settings import PRICING, settings


@dataclass
class UsageRecord:
    prompt_tokens: int
    completion_tokens: int
    model: str
    task_category: str = "general"

    @property
    def total_tokens(self) -> int:
        return self.prompt_tokens + self.completion_tokens

    def cost_usd(self, model: str | None = None) -> float:
        m = model or self.model
        inp_price, out_price = PRICING.get(m, (0.0, 0.0))
        return (self.prompt_tokens * inp_price + self.completion_tokens * out_price) / 1_000_000


@dataclass
class CostTracker:
    glm_model: str = field(default_factory=lambda: settings.glm_model)
    baseline_model: str = field(default_factory=lambda: settings.baseline_model)
    _records: list[UsageRecord] = field(default_factory=list, repr=False)

    def record(self, usage: dict[str, int], task_category: str = "general") -> UsageRecord:
        rec = UsageRecord(
            prompt_tokens=usage.get("prompt_tokens", 0),
            completion_tokens=usage.get("completion_tokens", 0),
            model=self.glm_model,
            task_category=task_category,
        )
        self._records.append(rec)
        return rec

    # ------------------------------------------------------------------
    # Aggregates
    # ------------------------------------------------------------------

    @property
    def total_calls(self) -> int:
        return len(self._records)

    @property
    def total_tokens(self) -> int:
        return sum(r.total_tokens for r in self._records)

    @property
    def actual_cost(self) -> float:
        return sum(r.cost_usd() for r in self._records)

    @property
    def baseline_cost(self) -> float:
        return sum(r.cost_usd(self.baseline_model) for r in self._records)

    @property
    def savings(self) -> float:
        return self.baseline_cost - self.actual_cost

    @property
    def savings_pct(self) -> float:
        if self.baseline_cost == 0:
            return 100.0
        return (self.savings / self.baseline_cost) * 100

    def summary(self) -> dict[str, float | int | str]:
        return {
            "total_calls": self.total_calls,
            "total_tokens": self.total_tokens,
            "glm_model": self.glm_model,
            "actual_cost_usd": round(self.actual_cost, 6),
            "baseline_model": self.baseline_model,
            "baseline_cost_usd": round(self.baseline_cost, 6),
            "savings_usd": round(self.savings, 6),
            "savings_pct": round(self.savings_pct, 1),
        }
