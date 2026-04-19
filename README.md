# ai-engineering-skills

Portable repository for the `ai-engineering` skill, packaged for the `skills.sh` ecosystem.

Copy this folder out of the project, turn it into its own Git repository, and publish it to GitHub or another Git host. Other people can then install it with `npx skills add ...` and pull newer versions with `npx skills update`.

## Contents

```text
ai-engineering-skills/
├── CHANGELOG.md
├── README.md
└── skills/
    └── ai-engineering/
        ├── SKILL.md
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
            ├── llm-calls.md
            ├── safety-evals.md
            ├── schema-design.md
            ├── tracing.md
            └── workflows.md
```

## What This Repo Is For

- Maintain one shared `ai-engineering` skill outside any single application repo.
- Version changes with normal Git tags and releases.
- Let teammates install the skill into Codex, Claude Code, Cursor, OpenCode, and other supported agents.
- Keep the skill content agent-focused while using this README for maintainer and consumer documentation.

## Local Validation

Run these commands from the parent directory of this folder.

List the skills exported by this repo:

```bash
npx skills add ./ai-engineering-skills --list
```

Install the skill from the local folder:

```bash
npx skills add ./ai-engineering-skills --skill ai-engineering
```

Install it globally for a specific agent:

```bash
npx skills add ./ai-engineering-skills --skill ai-engineering -g -a codex
```

## Turn This Into Its Own Repo

Copy the folder somewhere outside this project, then initialize and publish it:

```bash
cp -R ai-engineering-skills ~/code/ai-engineering-skills
cd ~/code/ai-engineering-skills
git init
git add .
git commit -m "Initial ai-engineering skill package"
git branch -M main
git remote add origin git@github.com:YOUR_ORG/ai-engineering-skills.git
git push -u origin main
```

If you prefer HTTPS:

```bash
git remote add origin https://github.com/YOUR_ORG/ai-engineering-skills.git
git push -u origin main
```

## How Others Install It

Install from GitHub shorthand:

```bash
npx skills add YOUR_ORG/ai-engineering-skills --skill ai-engineering
```

Install from a full GitHub URL:

```bash
npx skills add https://github.com/YOUR_ORG/ai-engineering-skills --skill ai-engineering
```

Install for a specific agent only:

```bash
npx skills add YOUR_ORG/ai-engineering-skills --skill ai-engineering -a codex
```

Install globally instead of per-project:

```bash
npx skills add YOUR_ORG/ai-engineering-skills --skill ai-engineering -g
```

List the skills available in the repo before installing:

```bash
npx skills add YOUR_ORG/ai-engineering-skills --list
```

## How Others Update It

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

## Maintainer Workflow

1. Edit the files under `skills/ai-engineering/`.
2. Validate locally with `npx skills add ./ --list`.
3. Commit the change.
4. Update `CHANGELOG.md`.
5. Tag a release.
6. Push commits and tags.
7. Tell teammates to run `npx skills update ai-engineering`.

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

## Private Team Distribution

If the skill contains internal conventions, prompts, or security guidance, keep this repository private and give teammates access to the repo. The `skills` CLI supports installing from Git repositories, so private distribution can still use the same structure and workflow as public distribution.

## Notes

- The actual skill package is the `skills/ai-engineering/` directory.
- `README.md` and `CHANGELOG.md` are for humans maintaining and adopting the repo.
- The `skills.sh` ecosystem discovers skills from repositories containing valid `SKILL.md` files with frontmatter.
