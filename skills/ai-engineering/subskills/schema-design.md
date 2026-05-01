# Schema Design

Design the schema before the prompt. The schema is the contract between the model and the rest of the system.

## Contents

- Core Rules: lines 18-31
- Schema-Guided Reasoning Patterns: lines 32-47
- Minimal Patterns: lines 48-85
- TypeScript and Python: lines 86-92
- Tool Schema Rules: lines 93-123
- Citation Pattern: lines 124-135
- Confidence Pattern: lines 136-153
- Failure Handling: lines 154-160
- Project Notes: lines 161-167
- Source Notes: lines 168-170

## Core Rules

1. Every field must either constrain reasoning or be consumed by code. Delete decorative fields.
2. Field order matters. Put fields in the sequence you want the model to think and emit them, such as evidence before decision, and decision before final action.
3. Prefer enums, literals, bounded lists, numeric ranges, and discriminated unions over free-form strings whenever logic branches on the value.
4. Keep field descriptions concise and local to the field. Longer policy, task instructions, and edge-case behavior belong in the system prompt.
5. Keep prompt-facing schemas separate from storage schemas. Do not mirror database tables into prompts by default.
6. Version persisted or cross-service schemas. If an old response can still exist, plan migration or compatibility logic.
7. Validate twice: schema-level validation at parse time and app-level invariants before using the result.
8. Never let the model supply security-critical context such as tenant IDs, auth scope, or hidden tool parameters. Inject those server-side.
9. Include evidence or citation fields whenever the output must be auditable against source material.
10. Encode stop reasons, approval states, and route choices as enums instead of free-form text.
11. When output tokens matter, design a lean runtime schema and a richer audit schema instead of forcing every request to emit the full internal rubric.

## Schema-Guided Reasoning Patterns

Use these patterns deliberately:

- Cascade: order fields to force reasoning from evidence to judgment to final action.
- Routing: use a discriminant field or union to force an explicit branch or tool choice.
- Cycle: use a bounded list of remaining steps plus the next action, execute only the next step, then replan.

The order of fields is part of the control surface. If you want the model to reason before answering, place reasoning fields before the final answer field. If you want explicit tool routing before arguments, place the route discriminator before the tool payload.

One practical provider detail: output ordering is not always a naive copy of schema property order. Required properties may be emitted before optional properties. If order matters, keep relevant fields required or account for provider reordering in parser tests.

For larger code examples, read `subskills/schema-examples.md`.

For provider-specific JSON Schema support, read `subskills/schema-provider-support.md`.

## Minimal Patterns

Reasoning before decision:

```python
from typing import Literal
from pydantic import BaseModel, Field


class AnalysisResult(BaseModel):
    evidence: list[str] = Field(description="Key facts")
    reasoning: str = Field(description="Short reasoning")
    final_answer: Literal["approve", "reject", "needs_review"] = Field(
        description="Decision"
    )
```

Explicit routing:

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
  action: z.discriminatedUnion("tool", [searchDocsSchema, sendReplySchema]),
});
```

## TypeScript and Python

- TypeScript: prefer Zod for tool inputs, structured outputs, and UI-facing message types.
- Python: prefer Pydantic models with `Annotated` constraints instead of deprecated helper types.
- Both: keep field names explicit, stable, and short enough for humans to inspect in logs and evals.
- If the task is mainly about retrieval, provenance, or confidence policy rather than the object contract itself, read the matching neighboring subskill and use this file only for the schema layer.

## Tool Schema Rules

1. Tool descriptions and schemas are part of the model contract. Treat them like API design.
2. Narrow tool inputs to only the minimum model-controlled arguments.
3. Put hidden execution context on the server side.
4. Keep tool outputs compact. Return identifiers or summaries, not giant payload dumps.
5. If downstream code branches on tool output, model that output with a schema too.
6. Keep per-field descriptions brief. If a field needs a paragraph to explain, the schema is carrying prompt logic that should live in the system prompt.
7. Prefer discriminated unions or literal action fields when the model must choose one tool or one next action.
8. If a tool can preview and commit, model those as separate actions or explicit modes rather than relying on prose.
9. When an agent is budgeted, expose budget-relevant fields like remaining steps or stop reason explicitly instead of hiding them in free text.
10. When outputs need citations, separate model-produced evidence objects from code-produced resolved citation objects.
11. If page markers are used for citation resolution, model the marker as a dedicated field instead of burying it inside the quote text.
12. Prefer short enums or reason codes over verbose explanations for runtime confidence signaling when token cost matters.

Bad field description:

```python
reasoning: str = Field(
    description="Think through the policy carefully, check all edge cases, do not hallucinate, consider prior messages, stay concise, and only approve if every rule is met."
)
```

Better:

```python
reasoning: str = Field(description="Short reasoning")
```

Put long instructions in the system prompt, where they apply consistently across the whole response.

## Citation Pattern

For grounded answers over documents, prefer this contract shape:

1. `ExtractedEvidence`: semantic support produced by the model
2. `ResolvedCitation`: exact provenance produced by code or the document layer
3. final answer object: answer plus one or more `ResolvedCitation` items

This split prevents a common failure mode where the model emits plausible-looking page numbers or offsets that were never verified against the source.

If the system uses page markers, put the marker on `ExtractedEvidence` and keep `ResolvedCitation.page_start` or equivalent as the verified physical page produced by code.

## Confidence Pattern

For confidence-heavy workflows, prefer:

1. place evidence, contradiction, and answerability checks before the final answer
2. place `answer` or `final_answer` before `confidence_bucket`
3. place `disposition` after `confidence_bucket` if the disposition depends on that confidence judgment
4. use a richer audit schema only when you need the full internal rubric

Default order for grounded business workflows:

1. support or evidence fields
2. conflict or answerability fields
3. final answer
4. confidence bucket
5. disposition
6. optional short reason codes

## Failure Handling

- If parsing fails, either retry with the validation errors or fail closed based on the risk of the action.
- Add regression tests whenever a schema update changes accepted values, field order, or downstream branching behavior.
- Run the project's AI-focused regression tests for changes that affect prompts, tools, or structured outputs.
- If grounded answers require citations, fail validation when citations are missing or malformed rather than silently accepting an ungrounded answer.

## Project Notes

- For long Pydantic and Zod examples, read `subskills/schema-examples.md`.
- For current provider support details, read `subskills/schema-provider-support.md`.
- For grounded citations, also read `subskills/citations.md`.
- For confidence buckets, abstention, or review routing, also read `subskills/confidence.md`.

## Source Notes

Sources for this page live in `sources.md#schema-design`, `sources.md#schema-examples`, and `sources.md#schema-provider-support`.
