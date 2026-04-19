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
9. Include evidence or citation fields whenever the output must be auditable against source material.
10. Encode stop reasons, approval states, and route choices as enums instead of free-form text.
11. When output tokens matter, design a lean runtime schema and a richer audit schema instead of forcing every request to emit the full internal rubric.

## Schema-Guided Reasoning Patterns

Use these patterns deliberately:

- Cascade: order fields to force reasoning from evidence to judgment to final action
- Routing: use a discriminant field or union to force explicit branch or tool choice
- Cycle: use a bounded list of remaining steps plus the next action, then execute only the next step and replan

These patterns are useful when the model must not skip intermediate checks, must choose among tools safely, or must plan adaptively without keeping stale long-form plans.

The order of fields is part of the control surface. If you want the model to reason before answering, place reasoning fields before the final answer field. If you want explicit tool routing before arguments, place the route discriminator before the tool payload.

One practical detail from Anthropic's structured output docs: output ordering is not always a naive copy of schema property order. Required properties are emitted before optional properties, each in schema order. If property order matters to your application or prompt design, either keep the relevant fields required or account for provider reordering in your parser and tests.

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
    final_answer: Literal["approve", "reject", "needs_review"] = Field(
        description="Decision"
    )
    confidence_bucket: Literal["low", "medium", "high", "very_high"] = Field(
        description="Confidence bucket"
    )
```

Why this shape works:

- `evidence` comes before `reasoning`, and `reasoning` before `final_answer`
- the enum on `final_answer` removes ambiguous free text
- `confidence_bucket` comes after `final_answer` because it is a meta-judgment about the answer, not evidence for the answer itself
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

### Python: extracted evidence versus resolved citation

```python
from typing import Literal

from pydantic import BaseModel, Field


class ExtractedEvidence(BaseModel):
    source_id: str = Field(description="Source selected by the model")
    quote: str = Field(description="Minimal supporting verbatim text")
    page_marker: str | None = Field(
        description="Machine-readable physical page marker if available"
    )
    support_type: Literal["direct", "derived"] = Field(
        description="Whether the quote directly states the claim"
    )


class ResolvedCitation(BaseModel):
    source_id: str = Field(description="Resolved source identifier")
    quote: str = Field(description="Quote resolved from source text")
    page_start: int | None = Field(description="Start page if page-based")
    page_end: int | None = Field(description="End page if page-based")  # as needed
    char_start: int | None = Field(description="Start character offset")  # as needed
    char_end: int | None = Field(description="End character offset")  # as needed
    block_id: str | None = Field(description="Stable parser block identifier")  # as needed
    resolver_confidence: float = Field(description="0 to 1 resolution confidence")
```

Why this shape works:

- `ExtractedEvidence` is model-produced semantic support
- `page_marker` gives the resolver a model-facing page prior without asking the model for offsets
- `ResolvedCitation` is code-produced provenance
- the split makes it obvious that page numbers and offsets do not come from the model
- resolver confidence gives the app a clean way to abstain or degrade gracefully

### TypeScript: Zod schema with enums, ints, optional fields

```ts
import { z } from "zod";

export const analysisResultSchema = z.object({
  evidence: z.array(z.string()).min(1).max(3).describe("Key facts"),
  reasoning: z.string().describe("Short reasoning"),
  escalationReason: z.string().optional().describe("Only if needed"),
  finalAnswer: z
    .enum(["approve", "reject", "needs_review"])
    .describe("Decision"),
  confidenceBucket: z
    .enum(["low", "medium", "high", "very_high"])
    .describe("Confidence bucket"),
});
```

Why this shape works:

- `z.enum(...)` is better than a free string when code branches on the result
- a small confidence enum is usually more stable than a raw decimal or ordinal score
- `.optional()` is useful for conditional details, but do not make core decision fields optional
- the order still matters: reasoning appears before `finalAnswer`, and `confidenceBucket` comes after it as a summary judgment

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

### TypeScript: extracted evidence versus resolved citation

```ts
import { z } from "zod";

export const extractedEvidenceSchema = z.object({
  sourceId: z.string().describe("Source selected by the model"),
  quote: z.string().describe("Minimal supporting verbatim text"),
  pageMarker: z
    .string()
    .optional()
    .describe("Machine-readable physical page marker if available"),
  supportType: z
    .enum(["direct", "derived"])
    .describe("Whether the quote directly states the claim"),
});

export const resolvedCitationSchema = z.object({
  sourceId: z.string().describe("Resolved source identifier"),
  quote: z.string().describe("Quote resolved from source text"),
  pageStart: z.number().int().optional().describe("Start page if page-based"),
  pageEnd: z.number().int().optional().describe("End page if page-based"),  // as needed
  charStart: z.number().int().optional().describe("Start character offset"),  // as needed
  charEnd: z.number().int().optional().describe("End character offset"),  // as needed
  blockId: z.string().optional().describe("Stable parser block identifier"),  // as needed
  resolverConfidence: z
    .number()
    .min(0)
    .max(1)
    .describe("0 to 1 resolution confidence"),
});
```

Use this split whenever a grounded answer must be auditable against a source document.

When you use page markers such as `@@page_14@@`, keep them in the model-produced evidence object and parse the physical page number in code during resolution.

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
7. Prefer discriminated unions or literal action fields when the model must choose one tool or one next action.
8. If a tool can preview and commit, model those as separate actions or explicit modes rather than relying on prose.
9. When an agent is budgeted, expose budget-relevant fields like remaining steps or stop reason explicitly instead of hiding them in free text.
10. When outputs need citations, separate model-produced evidence objects from code-produced resolved citation objects.
11. If page markers are used for citation resolution, model the marker as a dedicated field instead of burying it inside the quote text.
12. Prefer short enums or reason codes over verbose explanations for runtime confidence signaling when token cost matters.

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

## Citation Pattern

For grounded answers over documents, prefer this contract shape:

1. `ExtractedEvidence`: semantic support produced by the model
2. `ResolvedCitation`: exact provenance produced by code or the document layer
3. final answer object: answer plus one or more `ResolvedCitation` items

This split prevents a common failure mode where the model emits plausible-looking page numbers or offsets that were never verified against the source.

If the system uses page markers, put the marker on `ExtractedEvidence` and keep `ResolvedCitation.page_start` or equivalent as the verified physical page produced by code. Do not treat the page marker itself as final provenance.

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

This avoids paying for long internal rubrics on every request while preserving observability where it matters.

Exception:

- If confidence is itself an intermediate checkpoint in a multi-stage workflow, place that checkpoint earlier on purpose. Do not do this accidentally for final user-facing confidence.

## Failure Handling

- If parsing fails, either retry with the validation errors or fail closed based on the risk of the action.
- Add regression tests whenever a schema update changes accepted values, field order, or downstream branching behavior.
- Run the project's AI-focused regression tests for changes that affect prompts, tools, or structured outputs.
- If grounded answers require citations, fail validation when citations are missing or malformed rather than silently accepting an ungrounded answer.

## Sources

- https://abdullin.com/schema-guided-reasoning/ (last accessed 17.04.2026)
- https://abdullin.com/schema-guided-reasoning/patterns (last accessed 17.04.2026)
- https://abdullin.com/schema-guided-reasoning/adaptive-planning (last accessed 17.04.2026)
- https://abdullin.com/schema-guided-reasoning/demo (last accessed 17.04.2026)
- https://github.com/vamplabAI/sgr-agent-core (last accessed 17.04.2026)
- https://platform.claude.com/docs/en/build-with-claude/structured-outputs (last accessed 17.04.2026)
- https://ai-sdk.dev/docs/foundations/tools (last accessed 17.04.2026)
