# Workflows

Use this subskill for predefined input-to-output flows where code controls the sequence and the LLM fills in bounded steps. Workflows are not agents.

## Definition

Workflows are systems where LLMs and tools are orchestrated through predefined code paths. The model may classify, transform, evaluate, or generate structured output inside the flow, but code decides:

- which step runs next
- which tool or prompt is available at that step
- when the workflow ends
- what happens on failure or retry

If the model decides which tool to call next or when to stop, read `subskills/agents.md` instead.

## Preferred Order

Choose the simplest pattern that works:

1. Single LLM call
2. Prompt chain
3. Routing
4. Parallelization
5. Orchestrator-workers
6. Evaluator-optimizer

Only increase complexity when evals show a simpler workflow is insufficient.

## Workflow Patterns

### Prompt chaining

Use when a task decomposes cleanly into fixed subtasks and each step benefits from narrower instructions or validation gates.

### Routing

Use when the input belongs to distinct categories that should go to different prompts, models, tools, or downstream handlers.

### Parallelization

Use when independent subtasks can be run concurrently, or when multiple passes improve confidence through voting or focused review.

Parallelization is not only a latency decision. It can also change cache hit rates and cost. If many parallel calls share the same long document, system prompt, tool schema, or examples, think about execution order and batching strategy with provider caching in mind.

### Orchestrator-workers

Use when the overall workflow is still code-owned, but a coordinator model needs to break work into variable subproblems before handing them to bounded worker calls.

### Evaluator-optimizer

Use when generation quality improves through an explicit critique-and-revise loop with clear evaluation criteria.

This is often the highest-leverage pattern for B2B tasks that must be accurate, auditable, and cheap enough to run at scale. A verifier or critic step usually beats giving a single agent more autonomy.

## Rules

1. Keep control flow explicit in code. The LLM should not invent new loop structure in a workflow.
2. Make each step produce structured output with a validated schema.
3. Add programmatic gates between steps when quality or safety matters.
4. Keep prompts specialized per step rather than one overloaded mega-prompt.
5. Bound retries and refinement loops. Every workflow must have a deterministic exit path.
6. Pass only the minimum context needed for each step.
7. Prefer verifier stages over open-ended self-reflection. A bounded critique with explicit pass or fail criteria is easier to test.
8. When a step fails repeatedly, escalate or fail closed instead of looping until the budget is gone.
9. For high fan-out workflows, schedule work in a cache-aware order when the provider benefits from shared prompt prefixes or explicit cache objects. In practice, grouping by shared document or shared context can be cheaper than processing strictly in request-arrival order.

## Verification Pattern

For business workflows, use an explicit checker when the output will drive code, money, compliance, or user-visible action:

1. produce a draft or candidate action
2. run deterministic checks where possible
3. run an evaluator or critic only for what code cannot verify
4. accept, revise with bounded retries, or escalate

This keeps most of the system verifiable without turning everything into a free-form agent loop.

## Code Shape Examples

### TypeScript: explicit workflow orchestration

```ts
const classified = await classifyTicket(input);

if (classified.route === "billing") {
  const draft = await draftBillingReply(classified);
  const checked = await reviewReply(draft);
  return checked.finalReply;
}

if (classified.route === "bug") {
  const bug = await summarizeBug(classified);
  return await createBugHandoff(bug);
}

return await requestClarification(classified);
```

This is a workflow because code controls the branches and termination.

### Python: evaluator-optimizer workflow

```python
draft = write_answer(task)
review = review_answer(draft)

if review.status == "pass":
    return draft

improved = revise_answer(draft, review)
second_review = review_answer(improved)
return improved if second_review.status == "pass" else fail_closed()
```

This is still a workflow even though it loops once, because code owns the loop and exit path.

## TypeScript and Python

- TypeScript: model each step with typed input and output schemas and small, explicit orchestration functions.
- Python: use typed step functions with Pydantic models for handoff objects.
- In both stacks, keep the orchestration layer readable enough that a human can trace the path from input to output without simulating model autonomy.

## Project Notes

- If the project uses a framework-specific AI SDK or orchestration wrapper, read the corresponding local companion skill or docs as well.
- For step contracts and handoff objects, also read `subskills/schema-design.md`.
- For retrieval-heavy steps, also read `subskills/retrieval.md`.
- If workflow behavior changes, run the project's AI-focused regression tests if they exist.

## Sources

- https://www.philschmid.de/agent-skills-tips (last accessed 17.04.2026)
- https://www.anthropic.com/engineering/building-effective-agents (last accessed 17.04.2026)
- https://abdullin.com/schema-guided-reasoning/adaptive-planning (last accessed 17.04.2026)
- https://ai-sdk.dev/docs/foundations/tools (last accessed 17.04.2026)
- https://research.google/blog/ds-star-a-state-of-the-art-versatile-data-science-agent/ (last accessed 19.04.2026)
