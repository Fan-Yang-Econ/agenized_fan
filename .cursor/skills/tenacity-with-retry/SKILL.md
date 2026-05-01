---
name: tenacity-with-retry
description: Execute requested tasks with tenacity. Use when the user asks to keep going after errors, investigate failures, and retry until success or until 4 total attempts are completed.

disable-model-invocation: true
---

# Tenacity With Retry

## Core rule

do the task asked by the user, if there is an error / bug / failure, do not stop there, investigate the error, and retry the task until it succeed or you has tried 4 times.

## Execution policy

1. Attempt the requested task.
2. If the attempt fails, identify the direct cause from logs, errors, and outputs.
3. Apply a concrete fix or adjustment based on that cause.
4. Retry the task.
5. Stop only when:
   - the task succeeds, or
   - 4 total attempts have been completed.

## Reporting format

When this skill is active, report progress as:

- `Attempt N/4`
- failure reason (if any)
- fix applied before next retry
- final status (`succeeded` or `stopped after 4 attempts`)
