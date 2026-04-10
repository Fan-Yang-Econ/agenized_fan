---
name: git-commit-and-push
description: Commits all changes with a good message, pushes, and on push rejection runs git pull --rebase then pushes again; stops on rebase conflict for the user to resolve. Use when the user asks to commit and push, save and push, or commit -a -m and push.
disable-model-invocation: true
---

# Git commit and push (with rebase on conflict)

Use this workflow when the user wants to commit all changes, push, and handle remote conflicts via rebase.

## Steps

### 1. Generate a good commit message

- Run `git status` and `git diff` (or `git diff --staged` if you prefer to stage first) to see what changed.
- Do a quick code review focusing on bugs and errors. If none, proceed. Otherwise stop
- Write a short, imperative subject line (e.g. "Add auth to admin routes", "Fix DataFrame typing in query_log_visualization"). Optionally add a blank line and a brief body if the change needs explanation.
- Do not use "-m" multiple times; use a single message (escape newlines in the shell if needed, or use a commit message file).

### 2. Commit all changes (do not add any untracked/unindex files)

```bash
git commit -a -m "Your subject line here"
```

If the user provided a message, use it (improve only if vague). 

**Timeout:** When running this command, request a **longer timeout** (e.g. 120000–180000 ms) so pre-commit hooks (lint, tests, build) can finish. The default 30s often cuts off before the hook completes.

If there is a pre-commit hook which runs many checks/tests, wait till the pre-commit check to finish.

If nothing to commit, `git commit` exits non-zero; then skip to step 3 (push will be no-op or already clean).

### 3. Push

```bash
git push
```

Run from the repository root. If push succeeds, stop here.

### 4. If push is rejected (non-fast-forward)

If `git push` fails (e.g. "Updates were rejected because the remote contains work..."):

1. Run:
   ```bash
   git pull --rebase
   ```
2. **If rebase completes with exit code 0** (no conflict): run `git push` again, then stop.
3. **If rebase fails** (exit code non-zero, e.g. merge conflicts): do **not** run `git push`. Do **not** run `git rebase --abort` unless the user asks. Tell the user: "Push was rejected; pull --rebase was run and stopped due to conflicts. Please resolve the conflicts (edit the reported files, then `git add` and `git rebase --continue`), then push when ready."

## Summary

| Outcome | Action |
|--------|--------|
| Commit fails (nothing to commit) | Report "Nothing to commit" and stop. |
| Push succeeds | Done. |
| Push rejected → pull --rebase succeeds | Run `git push` again; then done. |
| Push rejected → pull --rebase fails | Stop; ask user to resolve conflicts and continue. |

## Notes

- Use the repository root as the working directory for all git commands.
- For "good" commit messages: prefer present tense, imperative ("Add feature" not "Added feature"); keep the subject under about 72 characters; add a body only when it adds context.
- Run the commit step with a longer timeout (e.g. 120000 ms) so pre-commit hooks can complete.
