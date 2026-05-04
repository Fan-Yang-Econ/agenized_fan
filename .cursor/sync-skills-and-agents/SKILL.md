---
name: sync-skills-and-agents
description: Sync Cursor/Claude/Codex skill and agent definitions from agenized_fan. Skills under `.cursor/skills`, `.claude/skills`, and `.codex/skills` are each a directory of symlinks (portable pack + sync-skills-and-agents meta). Codex agents are generated as TOML via agenized_fan/scripts/agent_md_to_codex_toml.py. Use when the user asks to keep `.cursor`, `.claude`, `.codex` aligned or to refresh local skill and agent links.
disable-model-invocation: true
---

# Sync Skills And Agents

## Purpose

The portable skill pack lives under `/Users/fanyang/shopily/agenized_fan/.cursor/skills`. The **sync-skills-and-agents** meta-skill lives at `/Users/fanyang/shopily/agenized_fan/.cursor/sync-skills-and-agents/` (outside the pack so the pack tree stays a clean “bundle,” while Cursor/Claude/Codex each get an extra symlink to this meta folder).

**`/Users/fanyang/shopily/agenized_fan/scripts/link_shopily_cursor_skills.sh`** materializes these three paths the same way:

- **`/Users/fanyang/shopily/.cursor/skills`**
- **`/Users/fanyang/shopily/.claude/skills`**
- **`/Users/fanyang/shopily/.codex/skills`**

Each is a **directory** of symlinks: one per top-level folder in the pack, plus **`sync-skills-and-agents`** → `/Users/fanyang/shopily/agenized_fan/.cursor/sync-skills-and-agents`.

Keep local skill and agent folders pointed at the same sources of truth:

- Skill source: `/Users/fanyang/shopily/agenized_fan/.cursor/skills`
- Agent source (Markdown): `/Users/fanyang/shopily/agenized_fan/.cursor/agents`
- Targets:
  - `/Users/fanyang/shopily/.cursor/skills` → **directory of symlinks** (script), including this meta skill
  - `/Users/fanyang/shopily/.cursor/agents` → symlink to agent Markdown source
  - `/Users/fanyang/shopily/.claude/skills` → **directory of symlinks** (script), including this meta skill
  - `/Users/fanyang/shopily/.claude/agents` → symlink to agent Markdown source
  - `/Users/fanyang/shopily/.codex/skills` → **directory of symlinks** (script), including this meta skill
  - `/Users/fanyang/shopily/.codex/agents` → **generated** `.toml` files (see below)

### Codex agents (TOML)

Codex expects agent config as TOML (e.g. `name`, `description`, `model`, `model_reasoning_effort`, optional `sandbox_mode`, and multiline `developer_instructions`). The repo script converts each `*.md` agent (YAML `---` frontmatter + body) into one `*.toml` file:

- Script: `/Users/fanyang/shopily/agenized_fan/scripts/agent_md_to_codex_toml.py`
- Requires **PyYAML** (`pip install pyyaml` if `import yaml` fails).

**Codex-only defaults** (the Markdown `model` field is for Cursor/IDE agents, not copied into Codex TOML):

- `model` → **`gpt-5.5`**
- `model_reasoning_effort` → **`medium`**, except agent **`shoply-staff-sde`** → **`high`**

Optional YAML overrides for the generated TOML: `codex_model`, `codex_model_reasoning_effort`. Optional passthrough: `sandbox_mode`. The Markdown body after the closing `---` becomes `developer_instructions`.

### Codex skills: implicit invocation (from `disable-model-invocation`)

Cursor/Claude use frontmatter `disable-model-invocation: true` so a skill is not auto-loaded from ambient context. Codex does not read that key; it uses **`agents/openai.yaml`**:

```yaml
policy:
  allow_implicit_invocation: false
```

When **`link_shopily_cursor_skills.sh`** runs, **`agenized_fan/scripts/skill_sync_codex_openai_policy.py`** updates each skill that **includes** `disable-model-invocation` in `SKILL.md` frontmatter and merges into `agents/openai.yaml`:

| `SKILL.md` | `agents/openai.yaml` |
|------------|-------------------------|
| `disable-model-invocation: true` | `policy.allow_implicit_invocation: false` |
| `disable-model-invocation: false` | `policy.allow_implicit_invocation: true` |

Skills **without** that frontmatter key are left unchanged (existing `openai.yaml` files are not modified by this step). Requires **PyYAML**.

## Commands

Run these commands from any directory:

```bash
mkdir -p /Users/fanyang/shopily/.cursor
mkdir -p /Users/fanyang/shopily/.claude
mkdir -p /Users/fanyang/shopily/.codex
/Users/fanyang/shopily/agenized_fan/scripts/link_shopily_cursor_skills.sh
ln -sfn /Users/fanyang/shopily/agenized_fan/.cursor/agents /Users/fanyang/shopily/.cursor/agents
ln -sfn /Users/fanyang/shopily/agenized_fan/.cursor/agents /Users/fanyang/shopily/.claude/agents

AG_SRC="/Users/fanyang/shopily/agenized_fan/.cursor/agents"
AG_DST="/Users/fanyang/shopily/.codex/agents"
if [ -L "$AG_DST" ]; then rm "$AG_DST"; fi
mkdir -p "$AG_DST"
python3 /Users/fanyang/shopily/agenized_fan/scripts/agent_md_to_codex_toml.py --source "$AG_SRC" --dest "$AG_DST"
```

The link script already updates **`.cursor/skills`**, **`.claude/skills`**, and **`.codex/skills`**; do not `ln -sfn` the pack over those paths afterward.

Override repo root: `SHOPILY_ROOT=/path/to/shopily agenized_fan/scripts/link_shopily_cursor_skills.sh`

## Verify

```bash
ls -la /Users/fanyang/shopily/.cursor /Users/fanyang/shopily/.claude /Users/fanyang/shopily/.codex
ls -la /Users/fanyang/shopily/.cursor/skills
ls -la /Users/fanyang/shopily/.claude/skills
ls -la /Users/fanyang/shopily/.codex/skills
ls -la /Users/fanyang/shopily/.codex/agents
```

Expected result:

- **`/Users/fanyang/shopily/.cursor/skills`**, **`.claude/skills`**, and **`.codex/skills`** are each a **directory** of symlinks into `/Users/fanyang/shopily/agenized_fan/.cursor/skills/*`, plus **`sync-skills-and-agents`** → `/Users/fanyang/shopily/agenized_fan/.cursor/sync-skills-and-agents`.
- Under `.cursor` and `.claude`, each `agents` entry is a symlink to `/Users/fanyang/shopily/agenized_fan/.cursor/agents`.
- Under `.codex/agents`, you see one `.toml` file per `*.md` in the agent source (names from frontmatter `name` or the Markdown stem), not a symlink to the Markdown folder.
