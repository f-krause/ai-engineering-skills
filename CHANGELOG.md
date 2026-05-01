# Changelog

All notable changes to this skill package should be documented in this file.

The format is intentionally simple and can be maintained by hand.

## [Unreleased]

- Tightened the `ai-engineering` skill trigger with negative scope for ordinary non-AI work.
- Split oversized schema guidance into core design, examples, and provider-support references.
- Moved external source lists into `skills/ai-engineering/sources.md` and left compact source pointers in subskills.
- Added `AGENTS.md` with repo maintenance rules, including source hygiene and trigger-eval guidance.
- Added `skills/ai-engineering/evals/trigger-queries.json` with positive, negative, and near-miss trigger cases.
- Added targeted line-range hints to `SKILL.md` and retained contents sections only for subskills over 150 lines.

## [0.2.0] - 2026-04-29

- Added `openai-web-search.md` for OpenAI Responses API hosted web search, structured outputs, URL annotations, source lists, filters, and citation handling.
- Polished cross-references and subskill boundaries so retrieval, citations, confidence, schema design, and eval guidance work as a cleaner whole.
- Added a dedicated `confidence.md` subskill for criteria-based confidence, abstention, review routing, contradiction handling, and lean-vs-audit schema tradeoffs.
- Added a dedicated `citations.md` subskill for structured provenance, evidence extraction, exact text matching, page mapping, and layout-grounded highlights.
- Added a new `retrieval.md` subskill covering long-context vs search vs hybrid RAG decisions, chunking, reranking, and grounded answer design.
- Strengthened `agents.md` with budgeted loop guidance, explicit stop reasons, tool-design rules, context management, and multi-agent cautions.
- Expanded `safety-evals.md` into a fuller eval flywheel with real-trace datasets, capability vs regression suites, transcript and outcome grading, and efficiency metrics.
- Tightened `workflows.md` and `schema-design.md` around verifier stages, auditable outputs, and structured control fields.

## [0.1.0] - 2026-04-19

- First portable repository version of the `ai-engineering` skill.
- Includes the main `SKILL.md` entrypoint.
- Includes bundled subskills for:
  - LLM calls
  - Schema design
  - Workflows
  - Agents
  - Tracing
  - Safety and evals
