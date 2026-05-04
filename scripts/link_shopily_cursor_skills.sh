#!/usr/bin/env bash
# Materialize shopily/{.cursor,.claude,.codex}/skills as directories of symlinks:
# each folder under agenized_fan/.cursor/skills plus sync-skills-and-agents ->
# agenized_fan/.cursor/sync-skills-and-agents

set -euo pipefail

ROOT="${SHOPILY_ROOT:-/Users/fanyang/shopily}"
SKILL_SRC="$ROOT/agenized_fan/.cursor/skills"
SYNC_META="$ROOT/agenized_fan/.cursor/sync-skills-and-agents"

if [[ ! -d "$SKILL_SRC" ]]; then
  echo "Missing skill source: $SKILL_SRC" >&2
  exit 1
fi
if [[ ! -d "$SYNC_META" ]]; then
  echo "Missing meta skill dir: $SYNC_META" >&2
  exit 1
fi

materialize_skills_dest() {
  local DEST="$1"
  mkdir -p "$(dirname "$DEST")"

  if [[ -L "$DEST" ]]; then
    rm "$DEST"
  fi
  mkdir -p "$DEST"

  shopt -s nullglob
  local d base
  for d in "$SKILL_SRC"/*/; do
    [[ -d "$d" ]] || continue
    base=$(basename "$d")
    ln -sfn "$SKILL_SRC/$base" "$DEST/$base"
  done

  ln -sfn "$SYNC_META" "$DEST/sync-skills-and-agents"

  local entry
  for entry in "$DEST"/*; do
    [[ -e "$entry" ]] || { rm -f "$entry" 2>/dev/null || true; continue; }
    base=$(basename "$entry")
    if [[ "$base" == "sync-skills-and-agents" ]]; then
      continue
    fi
    if [[ ! -d "$SKILL_SRC/$base" ]]; then
      rm -f "$entry"
    fi
  done
}

materialize_skills_dest "$ROOT/.cursor/skills"
materialize_skills_dest "$ROOT/.claude/skills"
materialize_skills_dest "$ROOT/.codex/skills"

# Map SKILL.md disable-model-invocation -> Codex agents/openai.yaml policy.allow_implicit_invocation
python3 "$ROOT/agenized_fan/scripts/skill_sync_codex_openai_policy.py" --root "$ROOT"
