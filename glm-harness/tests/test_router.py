"""Tests for the task auto-router."""

import pytest
from glm_harness.router import TaskCategory, TaskRouter


@pytest.fixture
def router():
    return TaskRouter()


@pytest.mark.parametrize("prompt,expected", [
    ("Write a Python function to reverse a list", TaskCategory.CODING),
    ("Fix the bug on line 17 where it throws AttributeError", TaskCategory.CODING),
    ("Summarize this article in 3 bullet points", TaskCategory.SUMMARISATION),
    ("Translate the following text to Spanish", TaskCategory.TRANSLATION),
    ("Create an outline for my blog post about AI", TaskCategory.OUTLINE),
    ("Write a marketing email for our product launch", TaskCategory.COPYWRITING),
    ("What is the boiling point of water?", TaskCategory.QA),
    ("Compare microservices vs monolith architecture", TaskCategory.ANALYSIS),
])
def test_classify(router, prompt, expected):
    result = router.classify(prompt)
    assert result.category == expected, (
        f"Expected {expected} for '{prompt}', got {result.category} "
        f"(signals: {result.matched_signals})"
    )


def test_confidence_range(router):
    result = router.classify("Write a Python class for a binary tree")
    assert 0.0 <= result.confidence <= 1.0


def test_general_fallback(router):
    result = router.classify("Hello there")
    assert result.category == TaskCategory.GENERAL


def test_route_config_attached(router):
    result = router.classify("Summarise this document")
    assert result.config.temperature <= 0.5  # summarisation should be low-temp


def test_coding_low_temperature(router):
    result = router.classify("def fibonacci(n): # fix this function")
    assert result.config.temperature <= 0.3


def test_copywriting_high_temperature(router):
    result = router.classify("Write a blog post about travel tips")
    assert result.config.temperature >= 0.7
