# When something goes wrong — change the method, never the bar

A tool failing, a library missing or a network block is the most common
reason a session quietly falls back to a plain, generic UI. That fallback is
never acceptable: **a failure changes how you reach the result, not the
quality of the result.** Find the nearest route that keeps the design
ambition, say in the final message what you had to work around, and keep
every required step.

| What went wrong | Do this instead | Never |
|---|---|---|
| A specialist skill didn't load | Retry with the full name `arkar-dev-standards:<skill>`. Still failing → read its `SKILL.md` from the plugin folder (`skills/<skill>/SKILL.md`) with the Read tool and follow it. Say so in the report. | Carry on without that specialist's rules |
| Web fonts / CDN blocked | Bundle the chosen fonts locally (e.g. the `@fontsource/<font>` npm package → copy the `.woff2` files into the project), or pick a characterful font already available to the project. | Drop to the default system sans |
| Animation library unavailable or not allowed | CSS transitions/keyframes, the Web Animations API, View Transitions; on mobile, the platform's built-in animation APIs. Same motion language, same timings. | Ship without motion |
| No images, no image generation, no stock | Build visuals in code: SVG illustration, CSS/SVG patterns and textures, data visuals, product renders made of the UI itself. | Leave empty space or grey boxes where a visual belongs |
| Browser / Playwright missing | Install Playwright outside the project (the command in `arkar-ui-visual-qa/scripts/screenshot.cjs`), or use Claude in Chrome on a local URL. | Skip visual QA silently; claim it was checked |
| Port in use / another app answers | Pick another free port and confirm the page is your project. | Screenshot or quote another app |
| No subagent (Agent) tool for the independent review | Do the cold review in `arkar-ui-visual-qa/references/independent-review.md` (both briefs, evidence only) and record it as such. | Skip the review |
| Filming fails (script error) | Fix the step selector and retry; or film fewer, key steps; or use `screenshot.cjs --motion` plus manual mid-transition frames — and record what you could film. | Judge motion from stills only without saying so |
| Mock data / backend missing | Build realistic mock data and a simulated backend with real latency, so loading, empty, error and success states can all be seen. | Design only the happy path |
| Project constraints (no build step, old browsers, a fixed CSS framework) | Work within them with craft: the constraint shapes the technique, not the ambition. | Use the constraint as a reason for a plain UI |
| Running short of time or context | Keep the required steps (build sheet, verify against it, filming, the independent review, premium-pass record); polish less instead. Write the record early and update it. | Drop a required step "because the site is small" |
| Something you can't fix without AK (content, a backend, credentials) | Build everything else to the full standard, make the gap visible and honest in the UI (a clear placeholder state, never fake data presented as real), and list it as a decision for AK. | Lower the design to match the gap; point at a file that doesn't exist |

The UI quality gate (a hook in this plugin) checks before you finish that UI
work loaded the orchestrator and visual QA, and that new products and
redesigns have their compositions, critique and motion review recorded. If
it stops you, finish the missing step — don't argue with it or paper over it.
