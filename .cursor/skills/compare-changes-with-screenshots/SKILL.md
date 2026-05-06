---
name: compare-changes-with-screenshots
description: Compare visual effects of repository changes by creating paired Git worktrees, launching the app in each version, capturing before/after screenshots with browser automation, generating heatmaps, and producing a Markdown report. Use when the user asks to compare UI changes, prove a code change visually, generate screenshots for a diff, or show before/after evidence for Shoply frontend work.
disable-model-invocation: true
---

# Compare Changes With Screenshots

## Goal

Produce visual proof for a code diff:

- identify the relevant change set
- run the app with the change and without the change
- capture the same screens/actions in both versions
- generate visual-diff heatmaps for matched screenshot pairs
- write a Markdown report showing each meaningful code change with before, after, diff heatmap, and observed difference

Default to `http://localhost:3001` unless the user specifies another URL.

## Tool Compatibility

This skill is portable across Cursor, Claude, and Codex. Resolve `<skill-dir>` as the directory containing this `SKILL.md`; do not hardcode a user-level `.codex`, `.claude`, or `.cursor` path.

Use the strongest equivalent tool available in the current agent environment:

- Browser control: use Playwright/browser automation.
- Setup delegation: use `shoply-tester` when subagents are available; otherwise perform the setup directly using repo scripts.
- Screenshots: save real PNG files to the artifact directory regardless of which browser tool captures them.
- Heatmaps: use `<skill-dir>/scripts/generate_heatmap.mjs` first.

## Diff Selection

Identify the target repo from the current directory or the user's path.

Use the user's explicit comparison target if provided. Otherwise:

- If the worktree is dirty, compare uncommitted changes against `HEAD`.
- If the worktree is clean, compare the latest commit against its first parent, usually `HEAD^..HEAD`.

Inspect:

```bash
git status --short
git diff --stat
git diff --name-only
git log --oneline -2
```

For a dirty repo, include staged, unstaged, and relevant untracked files. Do not mutate or clean the user's original worktree.

## Worktree Setup

Create two sibling worktrees in the parent folder of the current repo, with names that clearly encode the repo and comparison:

- `<repo>-visual-after-<shortsha-or-timestamp>`: the version with the change
- `<repo>-visual-before-<shortsha-or-timestamp>`: the version without the change

For a clean repo:

- `before` should check out the base commit, normally `HEAD^`.
- `after` should check out the changed commit, normally `HEAD`.

For a dirty repo:

- `before` should check out `HEAD`.
- `after` should check out `HEAD`, then receive an exported patch or copied untracked files representing the dirty change.
- Preserve staged versus unstaged distinctions only if they matter to the behavior; otherwise applying the full dirty state is enough.

Prefer non-destructive commands:

```bash
git worktree add ../<repo>-visual-before-<id> <base-ref>
git worktree add ../<repo>-visual-after-<id> <changed-ref>
```

For dirty changes, export from the original repo and apply inside the `after` worktree:

```bash
git diff --binary > /tmp/<repo>-dirty.diff
git diff --binary --staged > /tmp/<repo>-staged.diff
```

Then apply both patches as appropriate with `git apply`. Copy untracked files manually only after listing them with `git status --short`.

## Local Environment

Only one local dev environment may be running at a time. Do not start the
`before` and `after` apps concurrently, even if subagents are available.

Use the `shoply-tester` subagent to set up the local dev environment when
subagents are available. Assign only setup, server launch, and teardown
responsibility; keep screenshot planning and browser capture in the main agent.

Run setup and capture sequentially:

1. Start the `after` worktree app.
2. Capture all `after` screenshots by following `<skill-dir>/screenshot-capture.md` -- write down the actions you did in navigation, click, typing, or any action.
3. Start the `before` worktree app.
4. Capture all matching `before` screenshots by the same steps you did in step 2.

For the `after` worktree:

- Ask `shoply-tester` to run the repo's local setup, install dependencies if needed, and start the app on `localhost:3001`.
- Ask it to report the exact command, URL, process/session state, stop command/session id, and any setup failures.
- Capture every planned `after` screenshot before starting the `before` environment.

For the `before` worktree:

- Ask `shoply-tester` to run the same setup and start the app on `localhost:3001` 
- Use the same runtime mode, env files, feature flags, seed data, browser size, and login/session assumptions as the `after` capture.
## Visual Diffs

For every matched `before` and `after` screenshot pair, generate a diff heatmap unless the images cannot be aligned or the change is intentionally nonvisual.

Use an available image comparison tool from the repo or local environment. Prefer, in order:

- this skill's bundled script: `node <skill-dir>/scripts/generate_heatmap.mjs`
- the app's existing Playwright screenshot comparison artifacts, if already configured and more appropriate for the repo
- Python with `Pillow`/`PIL`, if available
- another deterministic local image comparison tool

The bundled script auto-installs its local Node dependencies (`pixelmatch` and `pngjs`) into the skill directory if they are missing, then writes a heatmap and prints a JSON mismatch summary.

Use it like:

```bash
node <skill-dir>/scripts/generate_heatmap.mjs \
  --before visual-diff-artifacts/<id>/screenshots/before-01-settings.png \
  --after visual-diff-artifacts/<id>/screenshots/after-01-settings.png \
  --out visual-diff-artifacts/<id>/diffs/diff-01-settings.png \
  --summary-out visual-diff-artifacts/<id>/diffs/diff-01-settings.json
```

If the bundled script fails and no other image diff tool is available, still include the before and after screenshots, then state in the report that no heatmap was generated and why.

Keep heatmaps in `visual-diff-artifacts/<id>/diffs/` and name them to match the screenshot pair:

```text
screenshots/before-01-settings.png
screenshots/after-01-settings.png
diffs/diff-01-settings.png
```

When generating heatmaps:

- compare images with identical viewport and browser state
- capture screenshots with identical dimensions; the bundled script fails rather than silently resizing mismatched images
- ignore expected nondeterministic regions only if the repo already has a masking pattern or the user approves it
- include a short numeric summary when the tool provides one, such as changed pixels or mismatch percentage

## Comparison Report

Write a Markdown file in the artifact directory. Include:

- comparison basis: dirty changes versus `HEAD`, or `HEAD^..HEAD`, or user-specified refs
- worktree paths and server commands
- changed files summary
- screenshot plan
- visual diff method and any limitations
- one section per user-visible change or changed file group

For each section, include:

```markdown
### <change title>

Changed files: `path/to/file.tsx`, `path/to/styles.css`

Visual proof links:
- `path/to/file.tsx` -> screenshots `01-settings`
- `path/to/styles.css` -> screenshots `01-settings`

Expected visual effect: <short explanation>

Before:
![Before](/absolute/path/to/visual-diff-artifacts/<YYYYMMDD-HHMMSS>/screenshots/before-01-slug.png)

After:
![After](/absolute/path/to/visual-diff-artifacts/<YYYYMMDD-HHMMSS>/screenshots/after-01-slug.png)

Video (if available):
- `/absolute/path/to/visual-diff-artifacts/<YYYYMMDD-HHMMSS>/videos/after-01-slug.webm`

Diff heatmap:
![Diff heatmap](/absolute/path/to/visual-diff-artifacts/<YYYYMMDD-HHMMSS>/diffs/diff-01-slug.png)

Observed difference: <what changed visually>

Diff summary: <changed pixels or mismatch percentage if available>
```

Prefer absolute artifact paths in the report so links are unambiguous across worktrees and tooling contexts. If a changed file has no visual surface, state that no direct screenshot was applicable and explain the evidence used.

## Cleanup

Delete worktrees unless the user asks not to. In the final answer, report:

- Markdown report path
- screenshot directory path
- before and after worktree paths
- any setup or capture gaps
