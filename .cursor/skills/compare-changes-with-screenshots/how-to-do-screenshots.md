# Screenshot Capture

## Screenshot Plan

Read the code diff before browsing. Build a concrete capture plan from changed routes, components, copy, CSS, API behavior, or interaction handlers.

If you need to login, then use the login credentials defined in ./docs/docs/local_development.md

The plan must include:

- page URL or route
- viewport size
- required login or setup state
- exact interactions, in order
- screenshot filename for each state
- which changed files each screenshot is meant to prove

Prefer Playwright for navigation and actions when available. 
Use Chrome DevTools MCP as the fallback when Playwright is unavailable. Prefer accessibility snapshots for locating controls when the tool supports them, then use screenshots for visual evidence.

Keep the `after` and `before` plans identical. Capture the `after` plan first,
then stop that environment and repeat the same plan against `before`. If the
change removes or adds UI, perform the nearest equivalent action and note the
difference.

## Capture Rules

Use deterministic screenshot paths, preferably under a report directory in the original repo:

```text
visual-diff-artifacts/<YYYYMMDD-HHMMSS>/
  screenshots/
    after-01-<slug>.png
    before-01-<slug>.png
  videos/
    after-01-<slug>.webm
    before-01-<slug>.webm
  diffs/
    diff-01-<slug>.png
  visual-diff-report.md
```

For each capture:

- select or open the target page in Chrome DevTools MCP, Playwright, or the available browser automation tool
- set the same viewport
- navigate to `http://localhost:3001` or the target route
- wait for stable UI text or network idle when possible
- perform the planned actions
- take a screenshot
- if using Playwright, record a video for each capture flow (`after-*` and `before-*`) and save it under `videos/` with matching slug names

Take screenshots every 1 second during an interaction only when the user asks for step-by-step motion evidence or the UI is transient. Otherwise capture the final meaningful states.

Capture order is mandatory:

1. Capture every `after-*` screenshot while only the `after` server is running.
2. Shut down the `after` server.
3. Capture every `before-*` screenshot while only the `before` server is running.
4. Shut down the `before` server or document why it was intentionally left running.
