"""
Example: Task auto-routing demo — shows how different prompts are classified
and what configuration is applied without making any API calls.
"""

from glm_harness import TaskRouter

router = TaskRouter()

prompts = [
    "Debug this Python function — it throws a KeyError on line 42",
    "Write a compelling email subject line for our Black Friday sale",
    "Summarize this 5,000 word research paper into 5 bullet points",
    "Compare the pros and cons of microservices vs monolithic architecture",
    "What is the difference between TCP and UDP?",
    "Translate this paragraph from English to Spanish",
    "Create an outline for a 10-chapter book on personal finance",
    "Just tell me a fun fact",
]

print(f"{'Prompt':<55} {'Category':<15} {'Temp':<6} {'Confidence'}")
print("-" * 95)

for p in prompts:
    result = router.classify(p)
    short = p[:52] + "..." if len(p) > 55 else p
    print(f"{short:<55} {result.category.value:<15} {result.config.temperature:<6} {result.confidence:.0%}")
