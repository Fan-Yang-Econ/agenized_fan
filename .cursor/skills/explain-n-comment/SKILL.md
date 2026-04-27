---
name: explain-n-comment
description: >-
  Adds easy-to-understand, plane-english comments in the user’s selected or referenced code.
  Leads with product/business purpose; include technical detail only if the user
  explicitly asks for technical explanation.
  clarity. Use when the user invokes explain-n-comment, asks to explain a
  selection and comment it, or wants in-code documentation (no separate chat
  essay required).
disable-model-invocation: true
---

# Explain and Comment

When this skill applies, **edit the file** and add comments where they help future readers. **Do not** rely on a long explanation in chat — the documentation lives **in the code**.

 **Anchor on the "business purpose" first** (what user-facing or business outcome this supports) -- assuming the reader of the code / comment is a business-side person who has litte techinical knowledge of softwar engineerng. 
 
 Do not add technical deep-dives unless the user explicitly asks for technical explanation. Do not restate the code line-by-line.

## Workflow

1. **Scope** — Use the user’s selection, `@path:lines`, or the code they pasted. If the range is ambiguous, include one line of context above/below.
2. **Read context** — Open the file (or enough surrounding lines) so comments match naming, style, and language conventions.
3. **Comment in file** — Write **laymen, easy-to-understnad, explanatory** comments (length is fine if clarity needs it):
   - **Business “why” first** — Who benefits, what problem is solved, what would break or degrade without this logic (customers, agents, ops, compliance, etc., in plain terms).
   - **Technical detail only on request** — Add technical behavior only when the user explicitly asks for it.
   - Prefer the line immediately above the relevant statement, or a short block above a small region. Use end-of-line comments only when they stay readable.
   - Match existing comment style (`#`, `//`, `/* */`, docstrings) for that file.
   - Do not remove or rewrite unrelated code; only add comments (and minimal formatting if required by the linter).

## What to comment (same spirit as code-explain)

- **Business / Product / user story** — Tie the block to concrete scenarios (e.g. “agent must see X before replying,” “prevents double-billing,” “keeps chat list consistent with URL on desktop”).
- **Technical detail (optional)** — Include only when the user explicitly asks for technical explanation.

## What to skip

- Obvious assignments or standard library usage with no project-specific twist.
- Repeating the code in English when the names and control flow already make intent obvious **and** there is no product or risk story to tell.

## Output checklist

- [ ] Comments in the correct file(s) are **clear and explanatory** (product context first; technical detail only when requested).
- [ ] Comments follow local style (`//`, `#`, etc.).
- [ ] No unrelated refactors; comments only unless the user asked for more.
