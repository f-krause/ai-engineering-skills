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

One practical detail from Anthropic's structured output docs: output ordering is not always a naive copy of schema property order. Required properties are emitted before optional properties, each in schema order. If order matters to your application or prompt design, either keep the relevant fields required or account for provider reordering in your parser and tests.

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
    page_end: int | None = Field(description="End page if page-based")
    char_start: int | None = Field(description="Start character offset")
    char_end: int | None = Field(description="End character offset")
    block_id: str | None = Field(description="Stable parser block identifier")
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
- use optional fields only for genuinely conditional details, not for core decision outputs
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
  pageEnd: z.number().int().optional().describe("End page if page-based"),
  charStart: z.number().int().optional().describe("Start character offset"),
  charEnd: z.number().int().optional().describe("End character offset"),
  blockId: z.string().optional().describe("Stable parser block identifier"),
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
- If the task is mainly about retrieval, provenance, or confidence policy rather than the object contract itself, read the matching neighboring subskill and use this file only for the schema layer

## Provider Support Snapshot

Current provider structured-output pipelines all speak JSON Schema, but not the same JSON Schema. Treat Pydantic and Zod as authoring tools, not as proof that every constraint will be enforced by the model provider.

As of 2026-05-01, the portable baseline across OpenAI, Gemini, Claude, and Mistral is:

- object, array, string, integer, number, boolean, and null-compatible fields
- `properties`, `required`, `items`, concise `description`, and `additionalProperties: false`
- `enum` or language-level `Literal[...]` / `z.enum(...)` for controlled choices
- nested branch schemas for routing, preferably with a literal discriminator field
- app-side validation after parsing, even when provider-side constrained decoding is enabled

Use provider-specific constraints only when the provider and target model explicitly support them, and keep validation in code as the final authority.

| Feature | OpenAI | Gemini | Claude | Mistral |
| --- | --- | --- | --- | --- |
| Pydantic / Zod helpers | Native Python Pydantic and JS Zod helpers. Root schema must be an object, so wrap top-level unions. | Python Pydantic and JS Zod via JSON Schema conversion. | Python Pydantic and TS Zod helpers for JSON outputs; raw schemas for some SDKs. | Python Pydantic and TS Zod accepted by SDK parse helpers; raw JSON Schema accepted in `json_schema` mode. |
| Required / optional | All fields must be required. Model optionality as required nullable fields, such as `str | None` or `z.string().nullable()`. | `required` controls mandatory fields. Optional fields are supported; nullable fields use a type array containing `null`. | Optional fields are supported but count toward schema complexity limits. Required fields are emitted before optional fields. | Supports standard `required` in supplied JSON Schema; verify model behavior with evals for important optional fields. |
| Literals / enums | Supported. Good for route choices, stop reasons, and confidence buckets. | Supported for strings and numbers. | Supported through JSON Schema and SDK helpers. | Supported through JSON Schema and SDK helpers. |
| Discriminated unions / `anyOf` | `anyOf` is supported inside an object, but not as the root schema. | JSON Schema supports type arrays and a documented subset; test unions or `anyOf` before relying on them. | Union types are supported but expensive; current limits allow 16 union parameters across strict schemas in one request. | Custom structured outputs accept JSON Schema; docs do not publish a full keyword matrix, so test complex unions. |
| Numeric min / max | Supported for base structured-output models: `minimum`, `maximum`, exclusive bounds, and `multipleOf`. Not supported for fine-tuned models. | Supports inclusive `minimum` and `maximum` for numbers and integers. | SDKs may strip `minimum` and `maximum`, add the constraint to descriptions, then validate the original schema locally. Do not rely on provider-side numeric bounds. | Not documented in a provider keyword matrix. Use local validation for business-critical numeric bounds. |
| Array min / max | Supports `minItems` and `maxItems` for base structured-output models. Not supported for fine-tuned models. | Supports `minItems`, `maxItems`, `items`, and `prefixItems`. | Treat array bounds as local-validation constraints unless the exact target model and SDK path are verified. | Not documented in a provider keyword matrix. Use local validation for business-critical array bounds. |
| String constraints | Supports `pattern` and selected `format` values; `minLength` and `maxLength` are not in the supported list. Fine-tuned models do not support `pattern` or `format`. | Supports `enum` and selected `format` values such as date and time; length and regex constraints are not documented as supported. | Simple regex `pattern` has documented support; unsupported constraints such as `minLength` and `maxLength` may be stripped by SDK helpers and validated locally. | Not documented in a provider keyword matrix. Prefer enums and local validation over regex or length constraints. |
| Object strictness | `additionalProperties: false` is required on objects. | `additionalProperties` is supported and can be boolean or a schema. | SDK helpers add `additionalProperties: false`; use it explicitly in raw schemas. | Use `additionalProperties: false`; set `strict: true` when the SDK or API schema exposes it. |
| Ordering | Output follows schema key order. | Output follows schema key order; Gemini 2.0 also needs explicit `propertyOrdering`. | Required fields are emitted before optional fields, each in schema order. | Do not rely on ordering unless verified; design parsers to be order-insensitive. |
| Failure cases | Safety refusals may return a refusal shape rather than your schema; unsupported schema keywords error when strict mode is used. | Unsupported properties may be ignored; very large or deeply nested schemas may be rejected. | Refusals and `max_tokens` can produce non-schema output; complex schemas can fail grammar compilation. | JSON mode only guarantees JSON. Custom structured outputs are more reliable, but prompt iteration and local validation are still needed. |

Practical portability rules:

1. If the same schema must run across providers, avoid numeric bounds, string length, regex, and array length as model-enforced constraints. Put those constraints in descriptions and validate after parsing.
2. If the schema is OpenAI-only or Gemini-only, numeric ranges and bounded lists can be useful model-side constraints. Keep the local validator anyway.
3. If the schema is Claude-only, expect SDK helpers to simplify unsupported constraints before sending the schema. Use Pydantic/Zod validation after `parse()` for the real guarantee.
4. If the schema is Mistral-only, use custom structured outputs with `type: "json_schema"`, but run a small conformance eval for constraints beyond basic type, required, enum, and object shape.
5. Keep provider test fixtures for every schema that relies on anything beyond the portable baseline.

## Abdullin SGR Parameters

Rinat Abdullin's Schema-Guided Reasoning examples use a small, repeatable set of schema parameters:

- `Literal[...]` for final decisions, route discriminators, tool names, completion codes, priorities, document types, and entity types
- `Union[...]` for routing between mutually exclusive branches or tool commands
- a literal `tool` or `kind` field as the discriminator inside each branch
- `Annotated[int, Ge(...), Le(...)]` for bounded scoring, such as a 1 to 10 candidate rating
- `Annotated[int, Le(50)]` for hard business limits, such as maximum discount percentage
- `Annotated[List[T], MinLen(...), MaxLen(...)]` for cycle patterns and bounded multi-step plans
- `List[Union[...]]` when multiple tool calls may be dispatched in parallel
- `Field(..., description="...")` for narrow local guidance, such as identifying the field that should execute the first remaining step
- field order as the main reasoning control: summarize or inspect first, rate or check next, decide or route last

His adaptive-planning example is especially important for agents: the schema asks for `current_state`, then a bounded `plan_remaining_steps_brief`, then `task_completed`, then a routed `function` field. The runtime executes only the immediate next function and discards the rest of the plan, forcing replanning after every tool result instead of preserving stale plans.

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

- https://developers.openai.com/api/docs/guides/structured-outputs (last accessed 01.05.2026)
- https://ai.google.dev/gemini-api/docs/structured-output (last accessed 01.05.2026)
- https://platform.claude.com/docs/en/build-with-claude/structured-outputs (last accessed 01.05.2026)
- https://docs.mistral.ai/studio-api/conversations/structured-output/custom (last accessed 01.05.2026)
- https://docs.mistral.ai/api (last accessed 01.05.2026)
- https://abdullin.com/schema-guided-reasoning/ (last accessed 01.05.2026)
- https://abdullin.com/schema-guided-reasoning/patterns (last accessed 01.05.2026)
- https://abdullin.com/schema-guided-reasoning/adaptive-planning (last accessed 01.05.2026)
- https://abdullin.com/schema-guided-reasoning/demo (last accessed 01.05.2026)
- https://abdullin.com/schema-guided-reasoning/examples (last accessed 01.05.2026)
- https://github.com/vamplabAI/sgr-agent-core (last accessed 17.04.2026)
- https://ai-sdk.dev/docs/foundations/tools (last accessed 17.04.2026)
