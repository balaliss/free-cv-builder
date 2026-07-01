"""
Example: Basic chat with the GLM harness.

Set GLM_API_KEY in your environment or .env file before running.
Get a free key at https://open.bigmodel.cn/
"""

import os
from glm_harness import HarnessBuilder

harness = HarnessBuilder(api_key=os.getenv("GLM_API_KEY"))

prompts = [
    "Write a Python function that validates an email address using regex",
    "Summarize the concept of compound interest in 3 sentences",
    "What is the capital of Morocco?",
    "Write a compelling one-paragraph product description for a standing desk",
    "Create an outline for a blog post about remote work productivity",
]

for prompt in prompts:
    print(f"\n{'='*60}")
    print(f"PROMPT: {prompt}")
    resp = harness.chat(prompt)
    print(f"CATEGORY: {resp.category} (confidence: {resp.confidence:.0%})")
    print(f"RESPONSE:\n{resp.content[:300]}...")

print(f"\n{'='*60}")
print("SESSION SUMMARY")
summary = harness.tracker.summary()
for k, v in summary.items():
    print(f"  {k}: {v}")
