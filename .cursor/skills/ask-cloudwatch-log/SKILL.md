---
name: ask-cloudwatch-log
description: Download and analyze AWS CloudWatch logs from a CloudWatch console link, then answer user questions grounded in the retrieved log content. Use when the user shares a CloudWatch Logs URL, asks to investigate logs, or asks follow-up questions about a specific log window. When logs show Playwright or unit test failures, delegate to the shoply-tester agent for artifact retrieval (e.g. S3), deeper debugging, and validation.
disable-model-invocation: true
---
# Ask CloudWatch Log

## Purpose

Use this skill when a user gives a CloudWatch Logs link and wants questions answered from that log data.

The goal is to:
- extract log context from the URL,
- retrieve the matching logs via AWS CLI,
- keep a local artifact for follow-up questions,
- answer with evidence from the downloaded logs.

## Inputs expected

- A CloudWatch Logs console URL (or log group + time range).
- One or more analysis questions from the user.

## Workflow

1. **Confirm scope**
   - Extract: AWS region, log group, stream (if present), and time window.
   - If region or time range is missing, ask a concise clarifying question.

2. **Retrieve logs**
   - Prefer AWS CLI from shell.
   - If URL implies a specific stream:
     - use `aws logs get-log-events`.
   - If URL is broader (group/time window or insights context):
     - use `aws logs filter-log-events` with start/end time.
   - Save raw output JSON to a file for reuse in follow-ups.

3. **Normalize for analysis**
   - Convert JSON to a readable timeline (timestamp + message).
   - Keep both:
     - raw JSON (source of truth),
     - simplified text/markdown for quick querying.

4. **Answer questions with evidence**
   - Quote concrete lines, timestamps, request IDs, error signatures, and counts.
   - Separate facts from inference.
   - If evidence is missing, say so explicitly and suggest the next log query.

5. **Handle follow-up questions**
   - Reuse the saved local artifacts first.
   - Only re-query CloudWatch if the user asks for a different time window/group/stream.

6. **Test failures (Playwright / unit tests) — hand off to `shoply-tester`**
   - After retrieving and skimming logs, if the failure is **caused by or centered on** a **Playwright (E2E) test failure** or a **unit test failure** (Jest/pytest, CI test step exit non-zero, `playwright test`, `npm test`, spec file paths, assertion errors, timeouts, screenshot/video upload hooks, etc.), **do not stop at log summary alone**.
   - **Invoke the `shoply-tester` subagent** (Task tool, `subagent_type`: `shoply-tester`) with:
     - Paths to the saved raw JSON and timeline files you created,
     - Relevant quoted log excerpts (suite name, spec path, retry count, S3 URIs, `E2E_RUN_ID`, bucket/prefix hints, CodeBuild/build id if present),
     - AWS region and any **S3 artifact** URLs or key prefixes mentioned in the logs.
   - Ask that agent to: **review the log context**, **pull test artifacts from S3** when the logs reference them (videos, traces, reports), **reproduce or narrow the failure in the repo**, and **validate any proposed fix** (re-run targeted tests, align with existing Playwright/Jest patterns in Shoply/Shopily repos).
   - You keep ownership of the initial CloudWatch pull and URL parsing; `shoply-tester` owns deep test debugging, artifact retrieval, and validation loops. Synthesize a short answer for the user that points to both the log evidence and the tester’s conclusions.

## Command patterns

Use these as templates (adjust placeholders):

```bash
# Specific stream (always use python3 for scripts)
python3 - <<'PY'
import subprocess, pathlib
region = "<region>"
log_group = "<log-group>"
log_stream = "<log-stream>"
start_ms = "<start-ms>"
end_ms = "<end-ms>"
out_path = pathlib.Path("/tmp/cloudwatch/stream.raw.json")
out_path.parent.mkdir(parents=True, exist_ok=True)
cmd = [
  "aws", "logs", "get-log-events",
  "--region", region,
  "--log-group-name", log_group,
  "--log-stream-name", log_stream,
  "--start-time", str(start_ms),
  "--end-time", str(end_ms),
  "--output", "json",
]
res = subprocess.run(cmd, capture_output=True, text=True, check=True)
out_path.write_text(res.stdout)
print(out_path)
PY
```

```bash
# Group-wide search in a time window (always use python3 for scripts)
python3 - <<'PY'
import subprocess, pathlib
region = "<region>"
log_group = "<log-group>"
start_ms = "<start-ms>"
end_ms = "<end-ms>"
out_path = pathlib.Path(".tmp/cloudwatch/group.raw.json")
out_path.parent.mkdir(parents=True, exist_ok=True)
cmd = [
  "aws", "logs", "filter-log-events",
  "--region", region,
  "--log-group-name", log_group,
  "--start-time", str(start_ms),
  "--end-time", str(end_ms),
  "--output", "json",
]
res = subprocess.run(cmd, capture_output=True, text=True, check=True)
out_path.write_text(res.stdout)
print(out_path)
PY
```

```bash
# Normalize raw JSON into timeline text (python3)
python3 - <<'PY'
import json, pathlib
from datetime import datetime, UTC
raw_path = pathlib.Path(".tmp/cloudwatch/group.raw.json")
timeline_path = raw_path.with_suffix(".timeline.txt")
payload = json.loads(raw_path.read_text())
lines = []
for e in payload.get("events", []):
  ts = datetime.fromtimestamp(e["timestamp"] / 1000, UTC).isoformat()
  stream = e.get("logStreamName", "")
  msg = (e.get("message") or "").rstrip("\n")
  lines.append(f"{ts}\t{stream}\t{msg}")
timeline_path.write_text("\n".join(lines))
print(timeline_path)
PY
```

## URL parsing guidance

- CloudWatch console links often contain URL-encoded fragments.
- Decode encoded values before extracting fields.
- Common fields to recover:
  - region,
  - log group,
  - log stream or stream filter,
  - start/end time in epoch ms or relative form.

If the URL cannot be parsed reliably, ask the user for explicit values:
- region,
- log group name,
- stream name (optional),
- start/end timestamps.

## Output style

When answering, use:
- **Findings**: direct evidence from logs,
- **Likely cause**: concise hypothesis (if any),
- **Next checks**: exact query refinements needed.

Keep answers concise, but always evidence-backed.

## Failure handling

- If AWS auth fails (expired SSO/session, missing creds, AccessDenied), report the exact error and required user action.
- If log volume is too large, narrow by time range or filter pattern before analysis.
- Never invent log lines or timestamps.
- If the failure is a **Playwright or unit test** failure and you cannot invoke subagents, tell the user to run **`shoply-tester`** manually with the same log paths and S3 hints, or paste the log excerpts and artifact URIs.
