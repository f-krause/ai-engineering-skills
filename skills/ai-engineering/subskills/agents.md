# Agents

Use this subskill for autonomous tool-using loops where the model dynamically decides what to do next and when to stop.

## Definition

Agents are systems where the LLM directs its own process and tool usage based on environmental feedback. An agent typically receives a goal, inspects tool results, plans the next step, decides whether to continue, and eventually terminates or asks for help.

Agents are not predefined workflows. If code owns the sequence and termination conditions beyond simple loop bounds or checkpoints, read `subskills/workflows.md` instead.

## When to Use Agents

Use agents only when all of these are true:

- The number or order of steps cannot be hardcoded reliably
- The next action depends on runtime tool results
- Dynamic tool choice materially improves outcomes
- The task environment is trusted enough for bounded autonomy
- You have evals and guardrails strong enough to catch compounding errors

If a fixed path works, prefer a workflow.

## Agent Rules

1. Prefer a single agent first. Add multi-agent structure only after a simpler agent fails on evals.
2. Keep tools narrow, well-described, and least-privilege. Tool descriptions materially affect agent behavior.
3. Bound the loop with explicit stop conditions such as max steps, completion checks, approval gates, timeouts, and budget ceilings.
4. Make the current budget visible to the model. Include the current step index and remaining steps, time, or tool budget in the loop state.
5. Require human approval for costly, irreversible, or sensitive actions.
6. Ground every iteration in tool results, execution feedback, or other external state.
7. Log every step: model, prompt version, tool name, arguments, output summary, latency, cost, and stop reason.
8. Keep the agent state compact. Summarize long histories rather than blindly appending them.
9. Persist durable facts outside the transcript when tasks run long. Move stable memories, summaries, or artifacts into explicit storage instead of keeping everything in context.
10. Prefer a centralized orchestrator over uncoordinated swarms when you truly need multiple agents.

## Planning Pattern

Use short-horizon replanning:

- inspect current state
- decide whether the task is complete
- choose the next tool call or action
- execute
- observe the result
- replan

Do not rely on long static plans that drift away from reality.

For business operations, the model should usually plan only the next action, not the full execution graph. A stale 12-step plan is worse than a fresh one-step decision grounded in the newest tool output.

## Budgeting and Stop Reasons

Every production agent loop should have explicit operational budgets:

- max iterations
- max tool calls
- wall-clock timeout
- token or cost ceiling when available
- stop reasons such as `completed`, `max_steps`, `timeout`, `awaiting_human`, or `failed`

Near the end of a loop, tell the model that budget is nearly exhausted. This often improves completion behavior and reduces thrashing.

## Tool Design Rules

Treat tools like APIs for a junior but very fast coworker:

1. Separate read tools from write tools.
2. Keep names literal and unambiguous.
3. Keep model-controlled arguments minimal.
4. Inject hidden auth, tenant, and permission context server-side.
5. Make risky tools previewable or idempotent where possible.
6. Return compact, decision-useful outputs rather than raw payloads.
7. Include examples or edge-case notes when two tools are easy to confuse.

If tool misuse is common, fix the tool shape before adding more prompt text.

## Context Management

Long-running agents degrade when stale context dominates the window.

- Drop or summarize old tool results once they are no longer decision-critical.
- Keep a small working memory in the prompt and a durable memory outside it.
- Preserve artifacts and important conclusions in explicit state, not in free-form transcript only.
- If the platform supports context editing or memory tools, use them deliberately instead of appending forever.

## Multi-Agent Rule

Multi-agent systems are not a free upgrade.

- Use them when the task decomposes into parallelizable subproblems.
- Avoid them for sequential reasoning tasks where communication overhead fragments the reasoning process.
- Be especially skeptical in tool-dense environments. More agents plus many tools often increases coordination tax and error propagation.
- If you need multiple agents, prefer one orchestrator with bounded workers over independent agents that never validate each other.

## Code Shape

Reflect the autonomy boundary clearly in code:

- workflow code should look like explicit orchestration
- agent code should look like a bounded observe-plan-act loop
- tool definitions should be reusable, but workflow runners and agent runners should stay distinct

Do not hide autonomous behavior inside a function that reads like a normal pipeline.

## Code Shape Examples

### TypeScript: bounded agent loop

```ts
for (let step = 0; step < MAX_STEPS; step += 1) {
  const next = await planNextStep({
    ...state,
    currentStep: step + 1,
    remainingSteps: MAX_STEPS - (step + 1),
  });

  if (next.completed) {
    return next.result;
  }

  const observation = await runTool(next.toolCall);
  state = updateState(state, observation);
}

throw new Error("Agent stopped after max steps");
```

This is an agent because the model decides the next action at runtime.

### Python: short-horizon replanning

```python
while steps < max_steps:
    next_step = planner(
        {
            **task_state,
            "current_step": steps + 1,
            "remaining_steps": max_steps - (steps + 1),
        }
    )
    if next_step.task_completed:
        return next_step.function

    observation = dispatch(next_step.function)
    task_state = append_observation(task_state, observation)
    steps += 1

raise RuntimeError("max steps reached")
```

This matches the SGR adaptive-planning pattern: replan after every observation instead of keeping a stale long-lived plan.

## TypeScript and Python

- TypeScript: isolate the loop controller from tool implementations and typed tool schemas.
- Python: keep the agent runner separate from tool functions and state models.
- In both stacks, make the loop boundary and stop conditions obvious from the top-level control flow.

## Project Notes

- If the project uses a framework-specific agent SDK or orchestration wrapper, read the corresponding local companion skill or docs as well.
- For tool contracts and planner objects, also read `subskills/schema-design.md`.
- For knowledge tools, citations, or document lookup, also read `subskills/retrieval.md`.
- If agent orchestration changes, run the project's AI-focused regression tests if they exist.

## Sources

- https://www.anthropic.com/engineering/building-effective-agents (last accessed 17.04.2026)
- https://abdullin.com/schema-guided-reasoning/adaptive-planning (last accessed 17.04.2026)
- https://abdullin.com/schema-guided-reasoning/demo (last accessed 17.04.2026)
- https://github.com/vamplabAI/sgr-agent-core (last accessed 17.04.2026)
- https://ai-sdk.dev/docs/agents/building-agents (last accessed 17.04.2026)
- https://ai-sdk.dev/docs/agents/loop-control (last accessed 17.04.2026)
- https://research.google/blog/towards-a-science-of-scaling-agent-systems-when-and-why-agent-systems-work/ (last accessed 19.04.2026)
- https://www.anthropic.com/news/context-management (last accessed 19.04.2026)
- https://developers.openai.com/api/docs/guides/agent-builder-safety (last accessed 19.04.2026)
