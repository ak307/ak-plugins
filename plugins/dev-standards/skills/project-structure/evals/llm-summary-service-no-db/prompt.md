---
tags: [skill-creator]
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

Build a small FastAPI service in a folder named meeting-summary-service. It takes a meeting transcript (plain text, can be long) and returns a summary plus a list of action items with owner and due date if mentioned. It calls our local Qwen model through vLLM's OpenAI-compatible API (base url http://10.28.6.40:8000/v1, model name qwen3.6-35b). No database needed. Don't install packages or run anything, just write the code.
