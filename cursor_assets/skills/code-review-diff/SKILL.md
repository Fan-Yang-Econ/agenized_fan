---
name: code-review-diff
description: Reviews changed or newly added code from git diff for quality, bugs, performance, readability, and security. Use when the user asks for a code review of a git diff, changed code, or newly added code.
disable-model-invocation: true
---

# Code Review (Git Diff)

Review only the code that appears in the diff (changed or newly added lines) of the current repo, or the repo I specify. 

I may also let you to compare the diff between the current branch with another branch.

## Input

- If user didn't specify the repo, then use the currently opened file's repo.
- Prefer reviewing from **git diff** when available: run `git diff` (or `git diff --staged`, or path-specific) and review the resulting changes.
- If no git repo: review the code the user provided or that is in context (treat it as "newly added" for line-numbering).

## Evaluation Criteria

Evaluate the changed/new code against:

1. **bugs, logic errors or unhandled edge cases** – Null/undefined, empty inputs, boundary conditions, race conditions, and missing validation.
2. **If the change breaks other packages**: The code diff may not only affect the current repo, but also other repos in the /Users/fanyang/shopily/ workspace. So you need to check if my code diff can cause errors in other repos.
3. **Performance** – Unnecessary work, N+1 patterns, heavy operations in loops, missing caching, or inefficient algorithms.
4. **Readability and maintainability** – Clarity, structure, duplication, comments where needed, and appropriate abstraction.

## Output Format

### Findings (if any)

- Reference locations by **line number**. Line numbers **start at 1** and are based on the **code as presented** in the diff (i.e. the added/changed lines in the snippet the user sees).

### 3. When there are no issues

If nothing meaningful is found, say so clearly.
