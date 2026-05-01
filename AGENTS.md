# Repository Instructions

This repository packages the `ai-engineering` agent skill for distribution through the skills ecosystem.

## Working With This Repo

- The actual skill lives under `skills/ai-engineering/`.
- Treat `skills/ai-engineering/SKILL.md` as the router. Keep it short and use it to point agents to task-specific files.
- Put detailed guidance in directly linked files under `skills/ai-engineering/subskills/`.
- Avoid nested discovery chains. If a file may be needed by an agent, link it directly from `SKILL.md`.
- Keep files over 150 lines navigable with a `## Contents` section, and include current line ranges for each listed section.
- Keep the main skill's `## Quick Fetch Map` current when changing important line ranges in `SKILL.md` or splitting subskill files.
- Keep the root `README.md` and `CHANGELOG.md` for human maintainers; do not duplicate long skill instructions there.

## Source Hygiene

- Keep `skills/ai-engineering/sources.md` up to date whenever adding, removing, or materially changing externally sourced guidance.
- `sources.md` must contain all external sources grouped by page, using one section per page or reference file.
- Subskill files should end with a short `## Source Notes` section pointing to the matching `sources.md` anchor instead of embedding long URL lists.
- Re-check time-sensitive provider documentation before changing guidance about SDKs, models, pricing, caching, structured outputs, web search, or eval APIs.
- Prefer official provider documentation for provider-specific behavior. Use blogs and community posts for design heuristics, not as the sole source for API facts.

## Skill Design Rules

- Keep `SKILL.md` as a compact trigger and router, not an encyclopedia.
- Tighten the frontmatter `description` before adding more body text when trigger behavior is wrong.
- Include negative trigger scope when a broad description might hijack unrelated tasks.
- Use directives and small examples instead of long explanations.
- Split provider-specific or rarely needed material into separate files.
- Add or update `skills/ai-engineering/evals/trigger-queries.json` when changing the skill description or routing semantics.

## Validation

Run these checks before publishing:

```bash
npx skills add ./ --list
wc -l skills/ai-engineering/SKILL.md skills/ai-engineering/subskills/*.md
rg -n '^## Sources|http[s]?://' skills/ai-engineering/subskills skills/ai-engineering/SKILL.md
```

Expected source check behavior: provider URLs should be in `skills/ai-engineering/sources.md`, not repeated across subskills.
