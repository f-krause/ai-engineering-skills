# Schema Design

Design the schema before the prompt. The schema is the contract between the model and the rest of the system.

## Core Rules

1. Every field must either constrain reasoning or be consumed by code. Delete decorative fields.
2. Field order matters. Put fields in the sequence you want the model to think and emit them, such as evidence or reasoning before decision, and decision before final answer or action.
3. Prefer enums, literals, bounded lists, numeric ranges, and discriminated unions over free-form strings whenever logic branches on the value.
4. Keep field descriptions concise and local to the field. Descriptions should clarify the field, not restate the whole task. Longer instructions, policy, and edge-case behavior belong in the system prompt.
5. Keep prompt-facing schemas separate from storage schemas. Do not mirror database tables into prompts by default.
6. Version persisted or cross-service schemas. If an old response can still exist, plan migration or compatibility logic.
7. Validate twice: schema-level validation at parse time and app-level invariants before using the result.
8. Never let the model supply security-critical context such as tenant IDs, auth scope, or hidden tool parameters. Inject those server-side.

## Schema-Guided Reasoning Patterns

Use these patterns deliberately:

- Cascade: order fields to force reasoning from evidence to judgment to final action
- Routing: use a discriminant field or union to force explicit branch or tool choice
- Cycle: use a bounded list of remaining steps plus the next action, then execute only the next step and replan

These patterns are useful when the model must not skip intermediate checks, must choose among tools safely, or must plan adaptively without keeping stale long-form plans.

The order of fields is part of the control surface. If you want the model to reason before answering, place reasoning fields before the final answer field. If you want explicit tool routing before arguments, place the route discriminator before the tool payload.

## Examples

### Python: ordered reasoning with bounded fields

```python
from typing import Annotated, Literal

from annotated_types import Ge, Le, MaxLen, MinLen
from pydantic import BaseModel, Field


class AnalysisResult(BaseModel):
    evidence: Annotated[list[str], MinLen(1), MaxLen(3)] = Field(
        description="Key facts"
    )
    reasoning: str = Field(description="Short reasoning")
    confidence: Annotated[int, Ge(1), Le(5)] = Field(description="1 to 5")
    final_answer: Literal["approve", "reject", "needs_review"] = Field(
        description="Decision"
    )
```

Why this shape works:

- `evidence` comes before `reasoning`, and `reasoning` before `final_answer`
- the enum on `final_answer` removes ambiguous free text
- `confidence` is an integer with hard bounds
- field descriptions stay short; longer policy belongs in the system prompt

### Python: routing with discriminated unions

```python
from typing import Literal, Union

from pydantic import BaseModel, Field


class SearchDocs(BaseModel):
    tool: Literal["search_docs"]
    query: str = Field(description="Search query")


class SendReply(BaseModel):
    tool: Literal["send_reply"]
    message: str = Field(description="Reply text")


class NextAction(BaseModel):
    reasoning: str = Field(description="Why this action")
    action: Union[SearchDocs, SendReply] = Field(
        description="Chosen action"
    )
```

This mirrors SGR routing: first explain the step, then choose one branch.

### TypeScript: Zod schema with enums, ints, optional fields

```ts
import { z } from "zod";

export const analysisResultSchema = z.object({
  evidence: z.array(z.string()).min(1).max(3).describe("Key facts"),
  reasoning: z.string().describe("Short reasoning"),
  confidence: z.int().min(1).max(5).describe("1 to 5"),
  escalationReason: z.string().optional().describe("Only if needed"),
  finalAnswer: z
    .enum(["approve", "reject", "needs_review"])
    .describe("Decision"),
});
```

Why this shape works:

- `z.enum(...)` is better than a free string when code branches on the result
- `z.int().min().max()` makes numeric bounds explicit
- `.optional()` is useful for conditional details, but do not make core decision fields optional
- the order still matters: reasoning appears before `finalAnswer`

### TypeScript: routed tool schema

```ts
import { z } from "zod";

const searchDocsSchema = z.object({
  tool: z.literal("search_docs"),
  query: z.string().describe("Search query"),
});

const sendReplySchema = z.object({
  tool: z.literal("send_reply"),
  message: z.string().describe("Reply text"),
});

export const nextActionSchema = z.object({
  reasoning: z.string().describe("Why this action"),
  action: z.discriminatedUnion("tool", [
    searchDocsSchema,
    sendReplySchema,
  ]),
});
```

Use discriminated unions when the model must choose one explicit branch before emitting branch-specific payload.

## TypeScript and Python

- TypeScript: prefer Zod for tool inputs, structured outputs, and UI-facing message types
- Python: prefer Pydantic models with `Annotated` constraints instead of deprecated helper types
- Both: keep field names explicit, stable, and short enough for humans to inspect in logs and evals

## Tool Schema Rules

1. Tool descriptions and schemas are part of the model contract. Treat them like API design.
2. Narrow tool inputs to only the minimum model-controlled arguments.
3. Put hidden execution context on the server side.
4. Keep tool outputs compact. Return identifiers or summaries, not giant payload dumps.
5. If downstream code branches on tool output, model that output with a schema too.
6. Keep per-field descriptions brief. If a field needs a paragraph to explain, the schema is carrying prompt logic that should live in the system prompt instead.

### Description anti-pattern

Bad:

```python
reasoning: str = Field(
    description="Think through the policy carefully, check all edge cases, do not hallucinate, consider prior messages, stay concise, and only approve if every rule is met."
)
```

Better:

```python
reasoning: str = Field(description="Short reasoning")
```

Put the long instructions in the system prompt, where they apply consistently across the whole response.

## Failure Handling

- If parsing fails, either retry with the validation errors or fail closed based on the risk of the action.
- Add regression tests whenever a schema update changes accepted values, field order, or downstream branching behavior.
- Run the project's AI-focused regression tests for changes that affect prompts, tools, or structured outputs.

## Sources

- https://abdullin.com/schema-guided-reasoning/ (last accessed 17.04.2026)
- https://abdullin.com/schema-guided-reasoning/patterns (last accessed 17.04.2026)
- https://abdullin.com/schema-guided-reasoning/adaptive-planning (last accessed 17.04.2026)
- https://abdullin.com/schema-guided-reasoning/demo (last accessed 17.04.2026)
- https://github.com/vamplabAI/sgr-agent-core (last accessed 17.04.2026)
- https://platform.claude.com/docs/en/build-with-claude/structured-outputs (last accessed 17.04.2026)
- https://ai-sdk.dev/docs/foundations/tools (last accessed 17.04.2026)
