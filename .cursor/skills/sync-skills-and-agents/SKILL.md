---
name: sync-skills-and-agents
description: Sync Cursor skill and agent definitions into local Claude and Codex folders via symlinks. Use when the user asks to keep `.cursor/skills`, `.cursor/agents`, `.claude`, and `.codex` aligned or to refresh local skill and agent links.
disable-model-invocation: true
---

# Sync Skills And Agents

## Purpose

Keep local skill and agent folders pointed at the same sources of truth:

- Skill source: `/Users/fanyang/shopily/agenized_fan/.cursor/skills`
- Agent source: `/Users/fanyang/shopily/agenized_fan/.cursor/agents`
- Targets:
  - `/Users/fanyang/shopily/.cursor/skills`
  - `/Users/fanyang/shopily/.cursor/agents`
  - `/Users/fanyang/shopily/.claude/skills`
  - `/Users/fanyang/shopily/.claude/agents`
  - `/Users/fanyang/shopily/.codex/skills`
  - `/Users/fanyang/shopily/.codex/agents`

## Commands

Run these commands from any directory:

```bash
mkdir -p /Users/fanyang/shopily/.cursor
mkdir -p /Users/fanyang/shopily/.claude
mkdir -p /Users/fanyang/shopily/.codex
ln -sfn /Users/fanyang/shopily/agenized_fan/.cursor/skills /Users/fanyang/shopily/.cursor/skills
ln -sfn /Users/fanyang/shopily/agenized_fan/.cursor/agents /Users/fanyang/shopily/.cursor/agents
ln -sfn /Users/fanyang/shopily/agenized_fan/.cursor/skills /Users/fanyang/shopily/.claude/skills
ln -sfn /Users/fanyang/shopily/agenized_fan/.cursor/agents /Users/fanyang/shopily/.claude/agents
ln -sfn /Users/fanyang/shopily/agenized_fan/.cursor/skills /Users/fanyang/shopily/.codex/skills
ln -sfn /Users/fanyang/shopily/agenized_fan/.cursor/agents /Users/fanyang/shopily/.codex/agents
```

## Verify

```bash
ls -la /Users/fanyang/shopily/.cursor /Users/fanyang/shopily/.claude /Users/fanyang/shopily/.codex
```

Expected result: all `skills` entries are symlinks to `/Users/fanyang/shopily/agenized_fan/.cursor/skills`, and all `agents` entries are symlinks to `/Users/fanyang/shopily/agenized_fan/.cursor/agents`.
