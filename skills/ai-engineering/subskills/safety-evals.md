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

## Model Selection

Pick models with explicit tradeoffs:

- Capability: quality, tool use, structured output reliability
- Speed: latency and throughput for the user experience
- Cost: iteration cost and production cost

Start with the cheapest model that passes the eval set for the task. Upgrade only when task-specific evals show the need.

## Eval Rules

1. Define success as measurable outcomes, not the exact chain of thought or exact wording.
2. Keep a prompt set that includes should-pass, should-not-trigger, edge case, malformed-output, and adversarial cases.
3. Run multiple trials for nondeterministic behavior when the change is risky.
4. Fix trigger descriptions before overfitting the body of a skill or prompt.
5. Re-run evals without extra scaffolding occasionally to check whether the complexity is still needed.
6. Version prompts, schemas, tools, and models so regressions can be traced.

## Project Notes

- If AI prompts, tools, or routing behavior changed, run the project's AI-focused regression tests if they exist.
- For changes in model invocation shape, also read `subskills/llm-calls.md`.
- For tool permissions and planner safety, also read `subskills/agents.md`.

## Sources

- https://www.philschmid.de/agent-skills-tips (last accessed 17.04.2026)
- https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html (last accessed 17.04.2026)
- https://platform.claude.com/docs/en/about-claude/models/choosing-a-model (last accessed 17.04.2026)
