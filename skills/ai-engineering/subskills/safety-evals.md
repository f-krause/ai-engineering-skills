# Safety and Evals

Safety and evaluation are part of the feature, not polish after the feature.

## Security Rules

1. Treat user input, retrieved documents, files, web pages, and tool output as untrusted data.
2. Separate system instructions from untrusted data using clear boundaries in the prompt shape.
3. Validate tool calls against session, tenant, and permission context before execution.
4. Do not let the model choose hidden identifiers, secret scopes, or authorization context.
5. Apply least privilege to every tool, API key, and database access path.
6. Sanitize or bound remote content before it reaches later reasoning steps or UI rendering.
7. Log suspicious tool usage, anomalous step counts, prompt leak attempts, and blocked actions.
8. Use structured outputs between steps or nodes when untrusted data could otherwise flow into tool calls or approvals.

## Model Selection

Pick models with explicit tradeoffs:

- Capability: quality, tool use, structured output reliability
- Speed: latency and throughput for the user experience
- Cost: iteration cost and production cost

Start with the cheapest model that passes the eval set for the task. Upgrade only when task-specific evals show the need.

## Eval Flywheel

Treat evals as a continuous improvement loop:

1. collect real tasks, failures, and traces
2. turn them into eval cases with measurable success criteria
3. run the eval suite before and after changes
4. inspect failures by transcript and outcome
5. update prompts, tools, schemas, or architecture
6. promote solved failures into regression tests

In B2B systems, the best eval cases usually come from real work products and real failure traces, not synthetic trivia prompts.

## Eval Rules

1. Start early. Even 20 to 50 real tasks is enough for an initial suite.
2. Define success as measurable outcomes, not the exact chain of thought or exact wording.
3. Keep separate capability and regression suites. Capability should expose headroom; regression should protect established behavior.
4. Keep a prompt set that includes should-pass, should-not-trigger, edge case, malformed-output, and adversarial cases.
5. Run multiple trials for nondeterministic behavior when the change is risky or when the margin is small.
6. Grade both transcript and outcome for agents. The assistant saying "done" does not mean the environment is correct.
7. Include efficiency metrics such as latency, token usage, retry count, and tool-call count. Waste is a regression too.
8. Use deterministic graders first, model-based graders second, and periodic human calibration for economically important outputs.
9. Fix trigger descriptions before overfitting the body of a skill or prompt.
10. Re-run evals without extra scaffolding occasionally to check whether the complexity is still needed.
11. Version prompts, schemas, tools, and models so regressions can be traced.

## What To Measure

Choose measures that match the architecture:

- single-call systems: output correctness, schema validity, abstention behavior
- workflows: per-step success, routing correctness, final outcome
- agents: final environment state, transcript quality, tool-call correctness, stop reason
- retrieval systems: recall at K, citation quality, grounded-answer correctness
- confidence systems: answer vs abstain vs review correctness, contradiction handling, and empirical accuracy by confidence bucket

If the system creates or modifies business artifacts, measure the artifact directly. Grade the spreadsheet, ticket, summary, or code diff, not only the assistant text around it.

## Confidence and Calibration

Treat confidence as a workflow decision problem, not as a decimal the model self-reports.

Good patterns:

- define explicit confidence criteria such as source reliability, evidence strength, contradiction status, and answerability
- use categories or pass/fail-style review routing rather than pseudo-precise online probabilities
- measure whether `high` or `very_high` outputs are actually more accurate than `medium` or `low`
- evaluate abstention and human-review routing separately from answer correctness

If a confidence bucket does not correspond to meaningfully different observed accuracy, the bucket design is weak.

## Dataset Construction

Use the strongest available sources in this order:

1. real production traces or user-reported failures
2. dogfood runs from internal users
3. SME-authored tasks built from real artifacts
4. synthetic tasks only to patch obvious coverage gaps

Each new recurring failure should either become an eval case or be consciously rejected with a reason.

## Human Review

Add expert review when:

- the task is domain-specific or high-stakes
- automated grading is too brittle
- the output is an artifact such as a slide deck, legal draft, or business memo
- you are calibrating an LLM judge

For important launches, sample failing and passing traces for human review. Automated scores drift.

## Project Notes

- If AI prompts, tools, or routing behavior changed, run the project's AI-focused regression tests if they exist.
- For changes in model invocation shape, also read `subskills/llm-calls.md`.
- For tool permissions and planner safety, also read `subskills/agents.md`.
- For grounded retrieval or provenance changes, also read `subskills/retrieval.md` and `subskills/citations.md`.
- For criteria-based confidence, abstention, and review routing, also read `subskills/confidence.md`.
- For real-execution telemetry and turning traces into eval datasets, also read `subskills/tracing.md`.

## Sources

- https://www.philschmid.de/agent-skills-tips (last accessed 17.04.2026)
- https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html (last accessed 17.04.2026)
- https://platform.claude.com/docs/en/about-claude/models/choosing-a-model (last accessed 17.04.2026)
- https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents (last accessed 19.04.2026)
- https://developers.openai.com/api/docs/guides/evaluation-best-practices (last accessed 19.04.2026)
- https://developers.openai.com/api/docs/guides/agent-builder-safety (last accessed 19.04.2026)
- https://openai.com/index/gdpval/ (last accessed 19.04.2026)
- https://www.philschmid.de/testing-skills (last accessed 19.04.2026)
