"""Tests for cost tracker."""

from glm_harness.tracker import CostTracker


def test_free_model_zero_cost():
    tracker = CostTracker(glm_model="glm-4-flash", baseline_model="claude-3-5-sonnet")
    tracker.record({"prompt_tokens": 1000, "completion_tokens": 500}, "coding")
    assert tracker.actual_cost == 0.0


def test_savings_calculation():
    tracker = CostTracker(glm_model="glm-4-flash", baseline_model="claude-3-5-sonnet")
    tracker.record({"prompt_tokens": 1_000_000, "completion_tokens": 500_000})
    # glm-4-flash is free; claude-3-5-sonnet is $3/M in + $15/M out
    expected_baseline = (1_000_000 * 3 + 500_000 * 15) / 1_000_000
    assert abs(tracker.baseline_cost - expected_baseline) < 0.001
    assert tracker.savings == tracker.baseline_cost
    assert tracker.savings_pct == 100.0


def test_summary_keys():
    tracker = CostTracker()
    summary = tracker.summary()
    assert "total_calls" in summary
    assert "savings_pct" in summary
    assert "savings_usd" in summary
