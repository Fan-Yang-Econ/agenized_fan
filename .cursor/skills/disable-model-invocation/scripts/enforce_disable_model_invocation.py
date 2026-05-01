#!/usr/bin/env python3
import argparse
from pathlib import Path
from typing import List, Tuple


def split_frontmatter(text: str) -> Tuple[bool, List[str], List[str]]:
    lines = text.splitlines()
    if len(lines) < 3 or lines[0].strip() != "---":
        return False, [], lines

    end_idx = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end_idx = i
            break

    if end_idx is None:
        return False, [], lines

    frontmatter = lines[1:end_idx]
    body = lines[end_idx + 1 :]
    return True, frontmatter, body


def ensure_disable_model_invocation(frontmatter: List[str]) -> Tuple[List[str], bool]:
    key = "disable-model-invocation:"
    changed = False
    found_idx = -1

    for idx, line in enumerate(frontmatter):
        if line.strip().startswith(key):
            found_idx = idx
            break

    if found_idx == -1:
        frontmatter.append("disable-model-invocation: true")
        changed = True
    else:
        current = frontmatter[found_idx].strip().split(":", 1)[1].strip().lower()
        if current != "true":
            frontmatter[found_idx] = "disable-model-invocation: true"
            changed = True

    return frontmatter, changed


def derive_name_from_dir(skill_md_path: Path) -> str:
    return skill_md_path.parent.name


def ensure_minimal_frontmatter(skill_md_path: Path, body_lines: List[str]) -> List[str]:
    return [
        "---",
        f"name: {derive_name_from_dir(skill_md_path)}",
        "description: TODO",
        "disable-model-invocation: true",
        "---",
        "",
        *body_lines,
    ]


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Check and enforce disable-model-invocation: true for skill files."
    )
    parser.add_argument(
        "--skills-dir",
        default="/Users/fanyang/shopily/agenized_fan/.cursor/skills",
        help="Root directory containing skill folders with SKILL.md files.",
    )
    parser.add_argument(
        "--exclude",
        default="",
        help="Comma-separated skill names to skip (e.g. a,b,c).",
    )
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Only report compliance; do not write changes.",
    )
    args = parser.parse_args()

    skills_dir = Path(args.skills_dir).resolve()
    excluded = {name.strip() for name in args.exclude.split(",") if name.strip()}

    if not skills_dir.exists():
        print(f"ERROR: skills directory not found: {skills_dir}")
        return 1

    skill_files = sorted(skills_dir.glob("*/SKILL.md"))

    updated = []
    excluded_skills = []
    compliant = []
    missing_frontmatter = []

    for skill_file in skill_files:
        skill_name = skill_file.parent.name
        if skill_name in excluded:
            excluded_skills.append(skill_name)
            continue

        original_text = skill_file.read_text(encoding="utf-8")
        has_frontmatter, frontmatter, body = split_frontmatter(original_text)

        if not has_frontmatter:
            missing_frontmatter.append(skill_name)
            if args.check_only:
                continue
            new_lines = ensure_minimal_frontmatter(skill_file, body)
            skill_file.write_text("\n".join(new_lines).rstrip() + "\n", encoding="utf-8")
            updated.append(skill_name)
            continue

        new_frontmatter, changed = ensure_disable_model_invocation(frontmatter)
        if changed:
            if not args.check_only:
                new_text = "\n".join(
                    ["---", *new_frontmatter, "---", *body]
                ).rstrip() + "\n"
                skill_file.write_text(new_text, encoding="utf-8")
            updated.append(skill_name)
        else:
            compliant.append(skill_name)

    print(f"skills_dir: {skills_dir}")
    print(f"mode: {'check-only' if args.check_only else 'enforce'}")
    print(f"updated ({len(updated)}): {', '.join(updated) if updated else '-'}")
    print(
        f"already compliant ({len(compliant)}): "
        f"{', '.join(compliant) if compliant else '-'}"
    )
    print(
        f"excluded ({len(excluded_skills)}): "
        f"{', '.join(excluded_skills) if excluded_skills else '-'}"
    )
    print(
        f"missing frontmatter ({len(missing_frontmatter)}): "
        f"{', '.join(missing_frontmatter) if missing_frontmatter else '-'}"
    )

    if args.check_only and (updated or missing_frontmatter):
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
