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

### Orchestrator-workers

Use when the overall workflow is still code-owned, but a coordinator model needs to break work into variable subproblems before handing them to bounded worker calls.

### Evaluator-optimizer

Use when generation quality improves through an explicit critique-and-revise loop with clear evaluation criteria.

## Rules

1. Keep control flow explicit in code. The LLM should not invent new loop structure in a workflow.
2. Make each step produce structured output with a validated schema.
3. Add programmatic gates between steps when quality or safety matters.
4. Keep prompts specialized per step rather than one overloaded mega-prompt.
5. Bound retries and refinement loops. Every workflow must have a deterministic exit path.
6. Pass only the minimum context needed for each step.

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
- If workflow behavior changes, run the project's AI-focused regression tests if they exist.

## Sources

- https://www.philschmid.de/agent-skills-tips (last accessed 17.04.2026)
- https://www.anthropic.com/engineering/building-effective-agents (last accessed 17.04.2026)
- https://abdullin.com/schema-guided-reasoning/adaptive-planning (last accessed 17.04.2026)
- https://ai-sdk.dev/docs/foundations/tools (last accessed 17.04.2026)
