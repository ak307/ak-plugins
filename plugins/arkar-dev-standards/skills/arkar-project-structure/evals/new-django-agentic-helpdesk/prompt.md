---
tags: [skill-creator]
max_turns: 60
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

Set up a new Django project in a folder called it-helpdesk-agent: an IT helpdesk assistant agent built with LangGraph. Staff chat with it; it can look up their open tickets, create a new ticket, and search IT how-to documents. Uses our local Qwen through vLLM at http://10.28.6.40:8000/v1 (model qwen3.6-35b). Write the code only - don't install or run anything.
