#!/usr/bin/env python3
"""
Mirror SKILL.md `disable-model-invocation` into Codex `agents/openai.yaml` policy
(only when that frontmatter key is present):

  disable-model-invocation: true  ->  policy.allow_implicit_invocation: false
  disable-model-invocation: false ->  policy.allow_implicit_invocation: true

See Codex skill-creator references: `policy.allow_implicit_invocation` defaults to
true when omitted; false keeps the skill out of implicit context unless invoked
explicitly (e.g. $skill-name).

Invoked from link_shopily_cursor_skills.sh after skill symlinks are updated.
Requires PyYAML (same as agent_md_to_codex_toml.py).
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("Install PyYAML: pip install pyyaml", file=sys.stderr)
    raise


def _parse_frontmatter(skill_md: Path) -> dict:
    text = skill_md.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return {}
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}
    block = parts[1].strip()
    if not block:
        return {}
    data = yaml.safe_load(block)
    return data if isinstance(data, dict) else {}


def _coerce_disable_model_invocation(raw: object) -> bool:
    if isinstance(raw, bool):
        return raw
    if isinstance(raw, str):
        return raw.strip().lower() in ("true", "yes", "1", "on")
    return bool(raw)


def _process_skill_dir(skill_dir: Path, dry_run: bool) -> bool:
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.is_file():
        return False

    fm = _parse_frontmatter(skill_md)
    if "disable-model-invocation" not in fm:
        return False

    dmi = _coerce_disable_model_invocation(fm.get("disable-model-invocation"))
    target = not dmi
    openai_path = skill_dir / "agents" / "openai.yaml"

    if openai_path.is_file():
        raw = yaml.safe_load(openai_path.read_text(encoding="utf-8"))
        data: dict = raw if isinstance(raw, dict) else {}
    else:
        data = {}

    policy = data.get("policy")
    if not isinstance(policy, dict):
        policy = {}
        data["policy"] = policy

    if policy.get("allow_implicit_invocation") is target:
        return False

    policy["allow_implicit_invocation"] = target
    out = yaml.dump(
        data,
        default_flow_style=False,
        sort_keys=False,
        allow_unicode=True,
    )
    if dry_run:
        print(f"[dry-run] would write {openai_path} policy.allow_implicit_invocation={target}")
        return True

    openai_path.parent.mkdir(parents=True, exist_ok=True)
    openai_path.write_text(out.rstrip() + "\n", encoding="utf-8")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Sync Codex agents/openai.yaml policy from SKILL.md disable-model-invocation.",
    )
    parser.add_argument(
        "--root",
        default=os.environ.get("SHOPILY_ROOT", ""),
        help="Shopily repo root (default: SHOPILY_ROOT).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print actions without writing files.",
    )
    args = parser.parse_args()

    if not args.root:
        print("Pass --root or set SHOPILY_ROOT.", file=sys.stderr)
        return 2
    root_path = Path(args.root).resolve()

    skill_src = root_path / "agenized_fan" / ".cursor" / "skills"
    sync_meta = root_path / "agenized_fan" / ".cursor" / "sync-skills-and-agents"

    skill_dirs: list[Path] = []
    if skill_src.is_dir():
        for child in sorted(skill_src.iterdir(), key=lambda p: p.name.lower()):
            if child.is_dir():
                skill_dirs.append(child)
    if sync_meta.is_dir():
        skill_dirs.append(sync_meta)

    n = 0
    for d in skill_dirs:
        if _process_skill_dir(d, args.dry_run):
            n += 1

    if args.dry_run and n:
        print(f"Would update {n} skill(s).", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
