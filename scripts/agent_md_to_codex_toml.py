#!/usr/bin/env python3
"""
Convert Cursor-style agent markdown (YAML frontmatter + body) into Codex TOML
agent files. Emits name, description, model/reasoning defaults for Codex,
optional sandbox_mode from frontmatter, and developer_instructions = body.

Codex defaults: model gpt-5.5, model_reasoning_effort medium; shoply-staff-sde
uses high unless overridden via YAML codex_model_reasoning_effort.

Requires PyYAML (yaml.safe_load).
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError as e:  # pragma: no cover
    print("This script requires PyYAML: pip install pyyaml", file=sys.stderr)
    raise SystemExit(1) from e

# Cursor agent Markdown often sets `model` for Cursor/IDE; Codex uses separate defaults.
CODEX_DEFAULT_MODEL = "gpt-5.5"
CODEX_DEFAULT_MODEL_REASONING_EFFORT = "medium"
# Resolved agent `name` (frontmatter or stem) gets high reasoning unless overridden.
CODEX_HIGH_REASONING_EFFORT_NAMES = frozenset({"shoply-staff-sde"})

# Optional YAML overrides for Codex output: codex_model, codex_model_reasoning_effort.
# Other optional passthrough for TOML:
OPTIONAL_TOML_KEYS = ("sandbox_mode",)


def split_frontmatter(text: str) -> tuple[dict, str]:
    """Parse leading YAML frontmatter delimited by --- lines."""
    if not text.startswith("---"):
        return {}, text
    rest = text[3:]
    if rest.startswith("\n"):
        rest = rest[1:]
    elif rest.startswith("\r\n"):
        rest = rest[2:]
    else:
        return {}, text

    m = re.search(r"^---\s*$", rest, flags=re.MULTILINE)
    if not m:
        return {}, text

    fm_block = rest[: m.start()]
    body = rest[m.end() :]
    if body.startswith("\n"):
        body = body[1:]
    elif body.startswith("\r\n"):
        body = body[2:]

    data = yaml.safe_load(fm_block) or {}
    if not isinstance(data, dict):
        raise ValueError("Frontmatter must be a YAML mapping at the top level")
    return data, body


def toml_escape_basic(s: str) -> str:
    """TOML basic string (double-quoted, single line)."""
    return (
        '"'
        + s.replace("\\", "\\\\")
        .replace('"', '\\"')
        .replace("\n", "\\n")
        .replace("\r", "\\r")
        .replace("\t", "\\t")
        + '"'
    )


def toml_multiline_basic(s: str) -> str:
    """TOML multiline basic string (triple double-quote)."""
    escaped = s.replace("\\", "\\\\").replace('"', '\\"')
    return '"""\n' + escaped + '\n"""'


def build_toml(frontmatter: dict, body: str, source_path: Path) -> str:
    name = frontmatter.get("name")
    if not name or not isinstance(name, str):
        name = source_path.stem
    desc = frontmatter.get("description")
    if desc is not None and not isinstance(desc, str):
        desc = str(desc)

    lines: list[str] = [
        "# Codex agent generated from Cursor agent markdown.",
        f"# Source: {source_path}",
        "",
    ]

    def emit_scalar(key: str, value: object) -> None:
        if value is None:
            return
        if isinstance(value, bool):
            lines.append(f"{key} = {str(value).lower()}")
        elif isinstance(value, int) and not isinstance(value, bool):
            lines.append(f"{key} = {value}")
        elif isinstance(value, float):
            lines.append(f"{key} = {value}")
        elif isinstance(value, str):
            if "\n" in value or "\r" in value:
                lines.append(f"{key} = {toml_multiline_basic(value)}")
            else:
                lines.append(f"{key} = {toml_escape_basic(value)}")
        else:
            lines.append(f"{key} = {toml_escape_basic(str(value))}")

    emit_scalar("name", name)
    emit_scalar("description", desc)

    cm = frontmatter.get("codex_model")
    if isinstance(cm, str) and cm.strip():
        codex_model = cm.strip()
    else:
        codex_model = CODEX_DEFAULT_MODEL
    emit_scalar("model", codex_model)

    cr = frontmatter.get("codex_model_reasoning_effort")
    if isinstance(cr, str) and cr.strip():
        effort = cr.strip().lower()
    elif cr is not None and not isinstance(cr, str):
        effort = str(cr).strip().lower()
    elif name in CODEX_HIGH_REASONING_EFFORT_NAMES:
        effort = "high"
    else:
        effort = CODEX_DEFAULT_MODEL_REASONING_EFFORT
    emit_scalar("model_reasoning_effort", effort)

    for key in OPTIONAL_TOML_KEYS:
        if key not in frontmatter:
            continue
        emit_scalar(key, frontmatter[key])

    instructions = body
    lines.append("developer_instructions = " + toml_multiline_basic(instructions))
    lines.append("")
    return "\n".join(lines)


def write_agents(source: Path, dest: Path) -> list[str]:
    dest.mkdir(parents=True, exist_ok=True)
    generated: set[str] = set()

    for md in sorted(source.glob("*.md")):
        text = md.read_text(encoding="utf-8")
        fm, body = split_frontmatter(text)
        name = fm.get("name")
        if not name or not isinstance(name, str):
            name = md.stem
        out_name = f"{name}.toml"
        out_path = dest / out_name
        out_path.write_text(build_toml(fm, body, md.resolve()), encoding="utf-8")
        generated.add(out_name)

    for p in dest.glob("*.toml"):
        if p.name not in generated:
            p.unlink()

    return sorted(generated)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--source",
        type=Path,
        required=True,
        help="Directory of *.md Cursor agent files",
    )
    ap.add_argument(
        "--dest",
        type=Path,
        required=True,
        help="Directory to write *.toml Codex agent files",
    )
    args = ap.parse_args()
    src = args.source.expanduser().resolve()
    dst = args.dest.expanduser().resolve()
    if not src.is_dir():
        print(f"Source is not a directory: {src}", file=sys.stderr)
        raise SystemExit(2)
    written = write_agents(src, dst)
    for w in written:
        print(dst / w)


if __name__ == "__main__":
    main()
