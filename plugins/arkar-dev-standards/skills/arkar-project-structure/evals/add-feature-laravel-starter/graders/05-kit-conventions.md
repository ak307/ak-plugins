---
type: llm
focus: trace
weight: 1
---

Controllers authorise with Gate::authorize (not $this->authorize) and flash messages with Inertia::flash('toast', ...) (not ->with('success'))
