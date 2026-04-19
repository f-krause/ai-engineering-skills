# Confidence and Abstention

Use this subskill when adding or changing confidence buckets, abstention behavior, review routing, contradiction checks, source weighting, or verifier logic for grounded AI workflows.

## Core Position

Do not treat model confidence as introspection you can trust directly.

For production workflows, confidence should usually be derived from explicit criteria such as:

- source reliability
- evidence strength
- evidence coverage
- contradiction status
- answerability
- task type
- verifier outcome

The model may help classify these criteria, but the final confidence bucket or disposition should be tied to a rubric, not emitted as a free-form vibe.

## Preferred Output Shape

Separate these concepts:

- `confidence_bucket`: how well-supported the answer is
- `disposition`: what the system should do next

Good `confidence_bucket` values:

- `low`
- `medium`
- `high`
- `very_high`

Good `disposition` values:

- `answer`
- `review`
- `abstain`

`review` is not the same as low confidence. A workflow can send something to human review because it is high impact, contradictory, or policy-sensitive even when the model found strong evidence.

## Field Order

Field order matters.

Default order for confidence-heavy grounded schemas:

1. evidence or support fields
2. contradiction or answerability fields
3. final answer
4. `confidence_bucket`
5. `disposition`
6. optional short `reason_codes`

Why:

- evidence and conflict checks should shape the answer
- `confidence_bucket` is usually a meta-judgment about the answer that was produced
- `disposition` is often the final operational consequence of the answer plus confidence state

Put confidence before the final answer only when you are intentionally building an intermediate checkpoint inside a workflow, not when returning the final user-facing object.

## Why Categories Beat Raw Numbers

Avoid pseudo-precise runtime numbers such as `0.63` unless you have a separate empirical calibration layer.

Reasons:

1. Adjacent values like `0.61` and `0.65` do not usually correspond to stable behavioral differences across runs.
2. Verbalized or self-reported confidence is often miscalibrated.
3. Categorical rubrics are easier to explain, test, and operationalize.

If you want probabilities, derive them offline from observed accuracy by bucket instead of asking the model to invent decimals online.

## Criteria-Based Confidence

Use an explicit rubric. For document-grounded B2B work, the most useful criteria are:

### Source reliability

Example buckets:

- `audited_structured`
- `official_record`
- `internal_operational_doc`
- `external_reference`
- `marketing_material`
- `unknown_source_quality`

### Evidence strength

Example buckets:

- `exact_cell_or_quote`
- `exact_paragraph`
- `multi_quote_synthesis`
- `paraphrased_support`
- `weak_reference`
- `none`

### Coverage

Example buckets:

- `fully_supported`
- `partially_supported`
- `unsupported`

### Contradiction status

Example buckets:

- `no_conflict_found`
- `minor_conflict`
- `major_conflict`
- `unresolved_conflict`

### Answerability

Example buckets:

- `answerable`
- `insufficient_evidence`
- `contradictory_evidence`

### Task type

Example buckets:

- `extractive`
- `grounded_synthesis`
- `inferential`

## Recommended Workflow

1. retrieve or collect evidence
2. classify source type and source reliability
3. extract supporting evidence
4. explicitly search for counter-evidence or contradictions
5. determine answerability
6. draft the answer only if the evidence state allows it
7. derive `confidence_bucket` and `disposition` from the rubric

Do not only ask "what supports the answer?" Also ask "what conflicts with it?" Confidence should drop sharply when unresolved conflict exists.

## Mapping Rules

Use hard rules before soft judgment.

Good defaults:

- unresolved conflict should route to `review`
- unsupported claims should route to `abstain` or `review`
- low-trust sources should cap the confidence bucket
- inferential answers should usually not reach `very_high`
- exact extractive answers from authoritative structured sources can reach `very_high`

Example policy:

- `very_high`: exact support from authoritative source, no unresolved conflict, low interpretation burden
- `high`: strong support from reliable sources, no material conflict, some synthesis allowed
- `medium`: useful support exists but there is either weaker sourcing, partial coverage, or more interpretation
- `low`: weak support, ambiguous support, or low-trust source basis
- `review`: contradiction, material risk, policy trigger, or unresolved ambiguity

## Contradictions and Counter-Evidence

Counter-evidence search is a first-class part of confidence design.

For each answer:

- ask for strongest supporting evidence
- ask for strongest conflicting evidence
- ask whether conflicts are reconciled or unresolved

This is more robust than asking the model "how confident are you?"

If conflicts exist:

- resolved minor conflict may lower confidence one level
- major unresolved conflict should usually force `review`
- contradictory evidence with no clear resolution should block `very_high` and often block `high`

## Cost Tradeoff

Richer confidence schemas improve auditability but increase output tokens.

Design two modes when cost matters:

### Lean runtime mode

Return only what the application needs online, for example:

- `answer`
- `confidence_bucket`
- `disposition`
- `reason_codes`

Use short enums or literals instead of verbose prose.

### Audit mode

Return richer internals only when needed, for example:

- source reliability
- supporting evidence IDs
- contradiction status
- answerability
- verifier outcome
- human-review reason

Trigger audit mode selectively:

- high-stakes workflows
- sampled quality checks
- disagreement between generator and verifier
- low-confidence or review cases
- offline eval and calibration jobs

Do not pay for the full internal rubric on every low-risk request unless the business value justifies it.

## Lean Schema Pattern

A strong low-token runtime contract often looks like:

```json
{
  "answer": "Revenue grew 18% year over year.",
  "reason_codes": ["audited_source", "exact_quote", "no_conflict_found"],
  "confidence_bucket": "high",
  "disposition": "answer"
}
```

`reason_codes` should be short literals, not paragraphs.

## Audit Schema Pattern

Use a richer schema offline or on flagged cases:

```json
{
  "source_reliability": "audited_structured",
  "evidence_strength": "exact_cell_or_quote",
  "coverage": "fully_supported",
  "contradiction_status": "no_conflict_found",
  "answerability": "answerable",
  "answer": "Revenue grew 18% year over year.",
  "confidence_bucket": "high",
  "disposition": "answer"
}
```

This schema is better for debugging and calibration, but more expensive than the lean form.

## Evaluation Guidance

Evaluate confidence as decision quality, not as nice wording.

Measure:

1. does the system answer answerable cases?
2. does it abstain on insufficient-evidence cases?
3. does it route contradictory cases to review?
4. do higher confidence buckets actually have higher empirical accuracy?
5. does the system overuse `medium` as a default bucket?

For bucket calibration, compute observed correctness by bucket over real eval cases:

- `very_high` should be materially more accurate than `high`
- `high` should be materially more accurate than `medium`
- `medium` should not be a hiding place for uncertainty

If the buckets do not separate empirically, the rubric is weak.

## TypeScript and Python

- TypeScript: prefer enums or string literals for runtime confidence and disposition fields, plus compact `reasonCodes` arrays when needed.
- Python: keep the online response schema small and put richer rubric fields in a separate audit model.
- In both stacks, keep the mapping from rubric fields to final confidence explicit in code when possible.

## Project Notes

- For grounded evidence, citations, and provenance, also read `subskills/citations.md`.
- For schema design and enum-heavy contracts, also read `subskills/schema-design.md`.
- For eval design and human-review calibration, also read `subskills/safety-evals.md`.

## Sources

- https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations (last accessed 19.04.2026)
- https://platform.claude.com/docs/en/test-and-evaluate/define-success (last accessed 19.04.2026)
- https://developers.openai.com/api/docs/guides/evaluation-best-practices (last accessed 19.04.2026)
- https://hamel.dev/blog/posts/evals-faq/how-do-we-evaluate-a-models-ability-to-express-uncertainty-or-know-what-it-doesnt-know.html (last accessed 19.04.2026)
- https://hamel.dev/blog/posts/evals-faq/why-do-you-recommend-binary-passfail-evaluations-instead-of-1-5-ratings-likert-scales.html (last accessed 19.04.2026)
- https://abdullin.com/schema-guided-reasoning/ (last accessed 19.04.2026)
- https://aclanthology.org/2023.findings-acl.551/ (last accessed 19.04.2026)
- https://aclanthology.org/2025.acl-short.18/ (last accessed 19.04.2026)
- https://research.google/pubs/metafaith-faithful-natural-language-uncertainty-expression-in-llms/ (last accessed 19.04.2026)
- https://www.nature.com/articles/s41586-024-07421-0 (last accessed 19.04.2026)
- https://aclanthology.org/2025.findings-acl.234/ (last accessed 19.04.2026)
- https://aclanthology.org/2024.emnlp-main.499/ (last accessed 19.04.2026)
