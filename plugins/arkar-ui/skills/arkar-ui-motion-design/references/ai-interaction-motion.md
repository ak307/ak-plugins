# AI interaction motion

AI products need users to understand what the system is doing right now and
to trust it. Motion makes those states legible — but only real states.

## States to design

| State | Show | Motion |
|---|---|---|
| Idle | the input ready, suggestions if useful | none |
| Listening (voice) | that audio is being captured | a live waveform/level meter driven by the real input level |
| Understanding / thinking | that a request was received and work started | a calm, low-key indicator near where the answer will appear; no fake text |
| Planning | the steps being taken, in user terms, if the product exposes them | steps appear as they start |
| Tool execution | which tool or source is being used ("Searching claims…", "Reading policy PDF") | a compact status line per tool with an indeterminate indicator, turning into a result/check when done |
| Generating / streaming | the answer forming | text streams in; a subtle caret or fade on newly arrived text; layout grows smoothly without jumping the scroll |
| Completed | the result, its sources and actions | the indicator resolves (check, collapse of tool steps into a summary) |
| Failed | what failed and what to do | calm error styling, retry, partial results kept |
| Interrupted / cancelled | that it stopped and what was kept | the stream stops immediately, a clear "Stopped" marker |

## Rules

- **Never simulate activity that isn't happening.** Indicators are driven by
  real events (request sent, tool started, first token, done). No fake
  progress bars, no invented steps, no typewriter effect on text that
  already arrived in full.
- **Never expose private internal reasoning** through animated status
  displays. Show actions and sources in user terms, not chain-of-thought.
- **Streaming:** append text as it arrives, render markdown incrementally
  without re-flowing everything, keep the user's scroll position if they've
  scrolled up ("Jump to latest" instead of yanking them down).
- **Control:** a visible Stop/Cancel during generation; cancellation takes
  effect immediately and says so.
- **Progressive results:** show partial results (first rows, first sources)
  as they arrive.
- **Completion:** settle quietly — collapse the activity into a short summary
  ("Searched 3 sources") the user can expand.
- **Voice:** waveforms reflect actual audio levels; clear visual difference
  between listening, processing and speaking.
- **Accessibility:** announce state changes politely (`aria-live="polite"`
  for status, not for every streamed token); reduced motion keeps the
  states as text/icons without pulsing.
- **Performance:** batch DOM updates while streaming (e.g. per animation
  frame); avoid re-rendering the whole conversation per token.
