# ai-engineering-skills

Portable repository for the `ai-engineering` skill of [Felix Krause](https://www.f-krause.at/), packaged for the `skills.sh` ecosystem.

## Quick Start

Install the skill:

```bash
npx skills add f-krause/ai-engineering-skills --skill ai-engineering
```

Update the skill later:

```bash
npx skills update ai-engineering
```

## Contents

```text
ai-engineering-skills/
├── CHANGELOG.md
├── README.md
└── skills/
    └── ai-engineering/
        ├── SKILL.md
        ├── evals/
        │   └── trigger-queries.json
        ├── sources.md
        └── subskills/
            ├── agents.md
            ├── caching/
            │   ├── anthropic.md
            │   ├── azure-claude.md
            │   ├── azure-mistral.md
            │   ├── azure-openai.md
            │   ├── gemini.md
            │   ├── mistral.md
            │   └── openai.md
            ├── citations.md
            ├── confidence.md
            ├── llm-calls.md
            ├── openai-web-search.md
            ├── retrieval.md
            ├── safety-evals.md
            ├── schema-design.md
            ├── schema-examples.md
            ├── schema-provider-support.md
            ├── tracing.md
            └── workflows.md
```

## More Details

### Install Options

Install from GitHub shorthand:

```bash
npx skills add f-krause/ai-engineering-skills --skill ai-engineering
```

Install from a full GitHub URL:

```bash
npx skills add https://github.com/f-krause/ai-engineering-skills --skill ai-engineering
```

Install for a specific agent only:

```bash
npx skills add f-krause/ai-engineering-skills --skill ai-engineering -a codex
```

Install globally instead of per-project:

```bash
npx skills add f-krause/ai-engineering-skills --skill ai-engineering -g
```

List the skills available in the repo before installing:

```bash
npx skills add f-krause/ai-engineering-skills --list
```

### Update Options

Update all installed skills:

```bash
npx skills update
```

Update only this skill:

```bash
npx skills update ai-engineering
```

Update only globally installed skills:

```bash
npx skills update -g
```

Update only project-installed skills:

```bash
npx skills update -p
```

## Local Validation

Run these commands from the parent directory of this folder.

List the skills exported by this repo:

```bash
npx skills add ./ai-engineering-skills --list
```

Run the trigger eval prompt set:

```bash
node ./ai-engineering-skills/skills/ai-engineering/evals/run-trigger-evals.mjs
```

Run the same eval with Codex as the router:

```bash
node ./ai-engineering-skills/skills/ai-engineering/evals/run-trigger-evals.mjs --codex
```

Install the skill from the local folder:

```bash
npx skills add ./ai-engineering-skills --skill ai-engineering
```

Install it globally for a specific agent:

```bash
npx skills add ./ai-engineering-skills --skill ai-engineering -g -a codex
```

## Notes

- The actual skill package is the `skills/ai-engineering/` directory.
- `skills/ai-engineering/sources.md` contains external sources grouped by page. Keep it updated when changing sourced guidance.
- `skills/ai-engineering/evals/trigger-queries.json` is the lightweight prompt set for checking trigger precision.
- `README.md` and `CHANGELOG.md` are for humans maintaining and adopting the repo.
- The `skills.sh` ecosystem discovers skills from repositories containing valid `SKILL.md` files with frontmatter.

## Maintainer Workflow

1. Edit the files under `skills/ai-engineering/`.
2. Validate locally with `npx skills add ./ --list`.
3. If sourced guidance changed, update `skills/ai-engineering/sources.md`.
4. If trigger semantics changed, update `skills/ai-engineering/evals/trigger-queries.json`.
5. Run `node skills/ai-engineering/evals/run-trigger-evals.mjs`.
6. Run `node skills/ai-engineering/evals/run-trigger-evals.mjs --codex` when trigger semantics changed.
7. Commit the change.
8. Update `CHANGELOG.md`.
9. Tag a release.
10. Push commits and tags.
11. Tell teammates to run `npx skills update ai-engineering`.

Example release flow:

```bash
git checkout main
git pull
git add skills/ai-engineering CHANGELOG.md README.md
git commit -m "Refine ai-engineering workflow guidance"
git tag v0.1.0
git push
git push --tags
```

## Versioning Recommendation

Use semantic version tags:

- `v0.1.0` for the first usable release
- `v0.2.0` for new guidance or bundled references
- `v0.2.1` for small fixes and wording corrections
- `v1.0.0` once the skill is stable and broadly shared

Recommended interpretation:

- Major: breaking restructures or changed trigger semantics
- Minor: new subskills, new workflows, expanded coverage
- Patch: typo fixes, clarifications, small corrections
