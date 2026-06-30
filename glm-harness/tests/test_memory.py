"""Tests for conversation memory."""

import pytest
from glm_harness.memory import ConversationMemory


def test_basic_turns():
    mem = ConversationMemory(system_prompt="You are helpful.")
    mem.add_user("Hello")
    mem.add_assistant("Hi there!")
    messages = mem.to_messages()
    assert messages[0]["role"] == "system"
    assert messages[1]["role"] == "user"
    assert messages[2]["role"] == "assistant"


def test_compaction_triggers():
    mem = ConversationMemory(max_turns=20, summarise_threshold=4)
    for i in range(10):
        mem.add_user(f"User message {i}")
        mem.add_assistant(f"Assistant reply {i}")

    # After compaction, turn count should be reduced
    assert mem.turn_count < 20
    assert mem._summary != ""


def test_tool_result_message():
    mem = ConversationMemory()
    mem.add_user("What time is it?")
    mem.add_assistant("", tool_calls=[{"id": "tc1", "type": "function", "function": {"name": "get_time", "arguments": "{}"}}])
    mem.add_tool_result("tc1", "get_time", "2024-01-01T12:00:00Z")

    messages = mem.to_messages()
    tool_msg = next(m for m in messages if m.get("role") == "tool")
    assert tool_msg["tool_call_id"] == "tc1"
    assert tool_msg["content"] == "2024-01-01T12:00:00Z"


def test_clear():
    mem = ConversationMemory(system_prompt="sys")
    mem.add_user("hello")
    mem.clear()
    assert mem.turn_count == 0
    assert mem._summary == ""
