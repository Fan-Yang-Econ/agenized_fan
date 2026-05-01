---
name: git-pull-rebase-safely
description: Run `git pull --rebase` safely in parallel across each git repo under the workspace, then report which repos were already updated, which pulled successfully, and which failed with reasons. Use when the user asks to sync/update many repos at once.
disable-model-invocation: true
---

# Git Pull Rebase Safely

Use this workflow when the user asks to run `git pull --rebase` for every repo under the workspace and wants a clear outcome report.

## Scope

- Workspace root: `/Users/fanyang/shopily`
- Target repos: immediate subdirectories under the workspace that are git repositories (`<workspace>/<repo>/.git` exists).

## Safety Rules

- Do not run destructive git commands (`reset --hard`, `clean -fd`, `checkout --`, `rebase --abort`) unless the user explicitly asks.
- Do not modify git config.
- If a repo has local changes, still attempt `git pull --rebase`; report failures clearly.
- Do not stop the whole process because one repo fails; continue processing all repos.

## Step-by-step

### 1) Discover candidate repos

From workspace root, list immediate child folders and keep only those with a `.git` directory.

Example:

```bash
for d in /Users/fanyang/shopily/*; do
  [ -d "$d/.git" ] && echo "$d"
done
```

If no repos are found, report that and stop.

### 2) Capture pre-state per repo

For each repo, collect:

- repo name/path
- current branch (`git rev-parse --abbrev-ref HEAD`)
- upstream availability (`git rev-parse --abbrev-ref --symbolic-full-name @{u}`)
- working tree status (`git status --short`)

If no upstream exists, classify as failure with reason `no upstream tracking branch`.

### 3) Run pull/rebase in parallel

Run `git pull --rebase` for each eligible repo in parallel (one command per repo).

- Use tool-level parallel execution.
- Keep each command scoped to repo root (`working_directory`).
- Capture exit code and stderr/stdout for classification.

### 4) Classify each repo outcome

Classify into exactly one bucket:

- **Already updated**
  - Pull succeeded and output indicates already up to date (examples: `Already up to date.`, `Current branch ... is up to date.`).
- **Pull successful**
  - Pull/rebase succeeded and fetched/rebased new commits.
- **Pull failed**
  - Non-zero exit or pre-check blocker (no upstream, detached HEAD if it blocks pull, auth/network errors, conflicts, unstaged/local-change blockers, etc.).
  - Include concise reason from git output.

### 5) Report in required format

Return exactly these sections:

1. **which repo has been already updated**
2. **which repo pull Successful**
3. **which repo has pull failures, and why**

For each repo entry include:

- repo name
- branch
- short status/reason

Keep failure reasons specific (for example: `rebase conflict in <file>`, `no upstream tracking branch`, `local changes would be overwritten`, `authentication failed`, `could not resolve host`).

## Optional follow-up guidance

After reporting, provide a short next-step suggestion only for failed repos (for example, set upstream, resolve conflicts then `git rebase --continue`, or fix credentials).
