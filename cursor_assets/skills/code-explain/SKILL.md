---
name: code-explain
description: Adds explanatory comments for non-obvious code, including magic numbers, implementation decisions, parameter purposes, and edge cases. Use when the user asks to explain code, add comments, document logic, improve maintainability, or clarify magic numbers, parameters, or platform-specific behavior.
disable-model-invocation: true
---

# Code Explain

Add comments so future developers understand *why* choices were made, not just *what* the code does. Prefer inline or block comments for the specific lines that need context; avoid commenting the obvious.

## What to Explain

### Magic numbers and constants

- Document how values were derived and why they matter.
- Prefer named constants with a short comment; if the value stays inline, add a comment.

```python
# Session timeout: 20 min per product spec; allows one tab to idle while user checks another.
MAX_SESSION_INTERVAL_SECONDS = 1200
```

### Parameter relationships and edge cases

- Note dependencies between parameters (e.g. "must be &lt; end" or "ignored when X is None").
- Call out edge-case behavior (empty input, overflow, null, platform quirks).

```python
def paginate(offset: int, limit: int):
    # offset and limit are clamped by the API; limit max is 100.
    # When offset >= total, API returns [] (no error).
```

### Implementation decisions

- Briefly state why this approach was chosen (e.g. performance, compatibility, legacy constraint).

```python
# Use sync client here; async would require propagating async through the pipeline (see ADR-12).
response = http_client.get(url)
```

### Non-obvious logic

- Add context for non-trivial conditionals, formulas, or control flow so intent is clear.

```python
# Treat as closed session only if last action is older than threshold; otherwise we might still get more events.
if current_time - last_action_ts > MAX_SESSION_INTERVAL_SECONDS:
    close_session()
```

### Platform- or version-specific behavior

- Document differences across OS, runtime, or library versions when they affect behavior.

```python
# On Windows, path separators are backslash; we normalize to forward slash for S3 keys.
key = path.replace(os.sep, "/")
```

## What to Skip

- Do not comment code that is already self-explanatory (e.g. `user_id = request.user.id`).
- Do not repeat the code in words (e.g. "set x to 5" above `x = 5`).
- Keep comments short; move long rationale to docstrings or ADRs when appropriate.

## Output

- Add or update comments only where they add real value.
- Preserve existing style (e.g. `#` vs `//`, same indentation and placement).
- Prefer commenting the line(s) that implement the non-obvious behavior rather than a generic block above.
