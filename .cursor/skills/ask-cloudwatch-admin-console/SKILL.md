---
name: ask-cloudwatch-admin-console
description: Analyze Shopify admin-console CloudWatch logs in us-west-1 from /ecs/shopify-webapp for a user-specified time range. Determine active log streams for that range, download logs, and answer questions with evidence. Use when the user asks about admin console incidents, errors, or behavior in this log group.
disable-model-invocation: true
---
# Ask CloudWatch Admin Console

## Purpose

Use this skill to investigate admin-console issues in CloudWatch with fixed defaults:
- region: `us-west-1`
- log group: `/ecs/shopify-webapp`

The skill must:
1. resolve the user time range,
2. determine which streams had events in that range,
3. download logs,
4. answer questions with concrete evidence.

## Inputs expected

- Required: time range (relative like "last 20 minutes" or absolute start/end).
- Optional: filter terms (error text, request path, request ID, shop).
- Required for analysis: user question(s).

If time range is missing, ask one concise clarifying question before running commands.

## Workflow

1. **Normalize time window**
   - Convert to epoch milliseconds: `start_ms`, `end_ms`.
   - Echo the interpreted window in local time and UTC before deep analysis.

2. **Determine streams active in the time range**
   - First pass (source of truth): run group-wide `filter-log-events` for the window and collect unique `logStreamName` values from returned events.
   - If zero events returned, run `describe-log-streams` ordered by `LastEventTime` and report that no stream has events in range.
   - Keep a saved artifact with discovered stream names.

3. **Download logs**
   - If one stream dominates, fetch via `get-log-events` for that stream.
   - If multiple streams are active, prefer `filter-log-events` for group-wide retrieval in the same window.
   - Save raw JSON files for reuse in follow-up questions.

4. **Normalize for analysis**
   - Build a timeline: `timestamp | stream | message`.
   - Keep both raw JSON and normalized text artifacts.

5. **Answer user questions**
   - Provide evidence: timestamps, stream names, request IDs, error signatures, and counts.
   - Separate facts from inference.
   - If evidence is insufficient, say exactly what is missing and suggest the next targeted query.

6. **Follow-ups**
   - Reuse saved artifacts when time range/log group are unchanged.
   - Re-query CloudWatch only when range/scope changes.

## Command patterns

```bash
# 1) Group-wide discovery + retrieval in one pass
aws logs filter-log-events \
  --region us-west-1 \
  --log-group-name "/ecs/shopify-webapp" \
  --start-time <start-ms> \
  --end-time <end-ms> \
  --output json
```

```bash
# 2) Fallback stream inventory (when no events found in range)
aws logs describe-log-streams \
  --region us-west-1 \
  --log-group-name "/ecs/shopify-webapp" \
  --order-by LastEventTime \
  --descending \
  --output json
```

```bash
# 3) Single-stream deep fetch
aws logs get-log-events \
  --region us-west-1 \
  --log-group-name "/ecs/shopify-webapp" \
  --log-stream-name "<stream-name>" \
  --start-time <start-ms> \
  --end-time <end-ms> \
  --output json
```

## Integration with /ask-cloudwatch-log

After stream discovery, reuse the same retrieval and evidence style as `/ask-cloudwatch-log`:
- store raw JSON artifacts,
- build normalized timeline artifacts,
- answer with **Findings**, **Likely cause**, **Next checks**.

When useful, generate CloudWatch stream URLs from discovered stream names and analyze each stream with the `/ask-cloudwatch-log` process.

## Output style

Use this structure:
- **Scope**: interpreted time range, region, log group, streams found.
- **Findings**: direct evidence with timestamps and stream references.
- **Likely cause**: concise hypothesis grounded in logs.
- **Next checks**: exact command/query refinements.

## Failure handling

- If AWS auth fails (`ExpiredToken`, SSO expired, `AccessDenied`), report exact CLI error and required user action.
- If volume is too large, narrow time range and/or add `--filter-pattern`.
- Never fabricate logs, timestamps, or counts.
