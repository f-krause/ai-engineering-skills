# Schema Examples

Use this reference when `subskills/schema-design.md` says examples would clarify the implementation. Do not read it for every schema task.

## Contents

- Python ordered reasoning with bounded fields: lines 16-44
- Python routing with discriminated unions: lines 45-71
- Python extracted evidence versus resolved citation: lines 72-109
- TypeScript Zod schema with enums, ints, optional fields: lines 110-133
- TypeScript routed tool schema: lines 134-159
- TypeScript extracted evidence versus resolved citation: lines 160-196
- Schema-guided reasoning parameters: lines 197-211
- Source Notes: lines 212-214

## Python: Ordered Reasoning With Bounded Fields

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
- `confidence_bucket` comes after `final_answer` because it is a meta-judgment about the answer
- field descriptions stay short; longer policy belongs in the system prompt

## Python: Routing With Discriminated Unions

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

This mirrors schema-guided routing: first explain the step, then choose one branch.

## Python: Extracted Evidence Versus Resolved Citation

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
- page numbers and offsets do not come from the model
- resolver confidence gives the app a clean way to abstain or degrade gracefully

## TypeScript: Zod Schema With Enums, Ints, Optional Fields

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
- optional fields are only for genuinely conditional details
- the order still matters: reasoning appears before `finalAnswer`

## TypeScript: Routed Tool Schema

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

## TypeScript: Extracted Evidence Versus Resolved Citation

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

## Schema-Guided Reasoning Parameters

Useful schema-guided reasoning parameters:

- `Literal[...]` for final decisions, route discriminators, tool names, completion codes, priorities, document types, and entity types
- `Union[...]` for routing between mutually exclusive branches or tool commands
- a literal `tool` or `kind` field as the discriminator inside each branch
- `Annotated[int, Ge(...), Le(...)]` for bounded scoring
- `Annotated[List[T], MinLen(...), MaxLen(...)]` for cycle patterns and bounded multi-step plans
- `List[Union[...]]` when multiple tool calls may be dispatched in parallel
- `Field(..., description="...")` for narrow local guidance
- field order as the main reasoning control: summarize or inspect first, rate or check next, decide or route last

For agents, the adaptive-planning shape is especially useful: `current_state`, bounded `plan_remaining_steps_brief`, `task_completed`, then a routed `function` field. The runtime executes only the immediate next function and discards the rest of the plan.

## Source Notes

Sources for this page live in `sources.md#schema-examples`.
