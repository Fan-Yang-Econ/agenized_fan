---
name: disable-model-invocation
description: Ensure skill files in `/Users/fanyang/shopily/agenized_fan/.cursor/skills` include `disable-model-invocation: true`. Use when creating, updating, or auditing skills and when the user wants model invocation disabled by default with explicit exclusions.
disable-model-invocation: true
---

# Disable Model Invocation

## Rule

Set `disable-model-invocation: true` for all skills in `/Users/fanyang/shopily/agenized_fan/.cursor/skills`, unless excluded by the user during the ask. By default, if the user does not specify exclusions, apply this to all skills in `agenized_fan`.

## Workflow

1. Do not ask for exclusions.
2. Build an exclusion set only from exclusions explicitly provided by the user when invoking the skill. If none are provided, use an empty set, which means all skills in `agenized_fan` are in scope.
3. Run the checker script in check mode first.
4. If non-compliant skills are found, run the script again in enforce mode.
5. Preserve existing frontmatter fields and content.
6. Report:
   - updated skills
   - excluded skills
   - already compliant skills

## Script

Use:

```bash
python /Users/fanyang/shopily/.codex/skills/disable-model-invocation/scripts/enforce_disable_model_invocation.py --check-only
python /Users/fanyang/shopily/.codex/skills/disable-model-invocation/scripts/enforce_disable_model_invocation.py
```

With exclusions:

```bash
python /Users/fanyang/shopily/.codex/skills/disable-model-invocation/scripts/enforce_disable_model_invocation.py --check-only --exclude "skill-a,skill-b"
python /Users/fanyang/shopily/.codex/skills/disable-model-invocation/scripts/enforce_disable_model_invocation.py --exclude "skill-a,skill-b"
```

## Notes

- If a skill has no frontmatter, add valid YAML frontmatter with `name`, `description` (if known), and `disable-model-invocation: true`.
- If frontmatter exists without `disable-model-invocation`, insert it.
- If it is set to `false`, change it to `true` unless the user explicitly excluded that skill.
