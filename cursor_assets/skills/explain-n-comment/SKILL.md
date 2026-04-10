---
name: explain-n-comment
description: >-
  Adds clear, explanatory comments in the user’s selected or referenced code.
  Leads with product/business purpose, then technical detail as needed for
  clarity. Use when the user invokes explain-n-comment, asks to explain a
  selection and comment it, or wants in-code documentation (no separate chat
  essay required).
disable-model-invocation: true
---

# Explain and Comment

When this skill applies, **edit the file** and add comments where they help future readers. **Do not** rely on a long explanation in chat—the documentation lives **in the code**. **Anchor on the product first** (what user-facing or business outcome this supports), then spell out technical behavior **when it helps someone maintain or change the code safely**. Do not restate the code line-by-line.

## Workflow

1. **Scope** — Use the user’s selection, `@path:lines`, or the code they pasted. If the range is ambiguous, include one line of context above/below.
2. **Read context** — Open the file (or enough surrounding lines) so comments match naming, style, and language conventions.
3. **Comment in file** — Write **clear, explanatory** comments (length is fine if clarity needs it):
   - **Product “why” first** — Who benefits, what problem is solved, what would break or degrade without this logic (customers, agents, ops, compliance, etc., in plain terms).
   - **Then technical detail** — As much as needed so a future reader understands non-obvious mechanics (concurrency, ordering, API contracts, edge cases, why not to “simplify” the code away). Include technical depth whenever it reduces ambiguity; do not artificially shorten at the expense of clarity.
   - Prefer the line immediately above the relevant statement, or a short block above a small region. Use end-of-line comments only when they stay readable.
   - Match existing comment style (`#`, `//`, `/* */`, docstrings) for that file.
   - Do not remove or rewrite unrelated code; only add comments (and minimal formatting if required by the linter).

## What to comment (same spirit as code-explain)

- **Product / user story** — Tie the block to concrete scenarios (e.g. “agent must see X before replying,” “prevents double-billing,” “keeps chat list consistent with URL on desktop”).
- **Technical detail** — Magic numbers, thresholds, units; ordering guarantees; defensive branches; integration shapes (field names, event types); race conditions and cache behavior—whenever omitting them would confuse a maintainer.

## What to skip

- Obvious assignments or standard library usage with no project-specific twist.
- Repeating the code in English when the names and control flow already make intent obvious **and** there is no product or risk story to tell.

## Output checklist

- [ ] Comments in the correct file(s) are **clear and explanatory** (product context first, then technical as needed).
- [ ] Comments follow local style (`//`, `#`, etc.).
- [ ] No unrelated refactors; comments only unless the user asked for more.
