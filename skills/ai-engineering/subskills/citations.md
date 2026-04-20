# Citations and Provenance

Use this subskill when adding or changing inline citations, evidence spans, quoted support, page jumps, PDF highlights, offsets, bounding boxes, or provenance metadata for grounded answers.

This subskill is about provenance after evidence has already been found. If the main issue is how to retrieve the right evidence, start with `subskills/retrieval.md`. If the main issue is how citations should affect confidence or review routing, also read `subskills/confidence.md`.

## Default Architecture

Use a two-stage citation pipeline:

1. Ask the model to produce claims plus supporting evidence text and source references.
2. Resolve exact locations with deterministic document logic, not with the model.

For page-based documents, the strongest default is:

- place easily extractable page markers (e.g. "@@page_<nr>@@" or "<!-- page <nr> -->") in the document
- retrieve candidate evidence
- ask the model to extract the minimal supporting quote or evidence span and page marker
- parse the physical page number from the page marker in code instead of trusting displayed page labels inside the PDF
- map that evidence back to the source document using text matching and document-layout metadata
- store normalized provenance such as page, offsets, block ID, and geometry
- render inline citations and highlights from stored provenance

Do not ask the model to invent page numbers, character offsets, or bounding boxes.

## Citation Spectrum

Treat citation quality as a spectrum:

1. source-level citation: file, URL, or document ID only
2. chunk-level citation: answer linked to a retrieved chunk or section
3. exact-text citation: answer linked to a verbatim text span
4. layout-grounded citation: answer linked to exact page locations and renderable geometry

For serious B2B document workflows, aim for level 3 by default and level 4 when users need page highlights, compliance review, or auditability.

## Core Rules

1. Citations are data, not formatting. Store them in structured objects.
2. Keep answer text separate from citation metadata so the UI can render footnotes, tooltips, page jumps, or highlights differently.
3. Require citations whenever the answer depends on retrieval or source documents.
4. If evidence cannot be resolved confidently, do not emit a precise-looking citation. Degrade to section-level provenance, source-level provenance, or let the workflow abstain or route to review.
5. Derive displayed quotes from resolved offsets or block IDs whenever possible, not from model prose alone.
6. Keep provenance immutable enough for audits: source version, file hash, document timestamp, or ingestion version should be available.
7. If source documents can change, distinguish citation-to-source-version from citation-to-latest-document.

## Recommended Pattern

Use the model for semantic selection, then use code for exact localization.

### Stage 1: semantic evidence extraction

Ask the model for:

- supporting evidence quotes or minimal evidence spans
- source identifiers
- page markers when available
- optional support type

The model is good at selecting the relevant supporting text. It is less reliable at exact character positions or page geometry.

### Stage 2: deterministic provenance resolution

Resolve the evidence into exact document locations using:

- exact string match
- normalized string match with whitespace and punctuation cleanup
- section-aware or page-aware constrained search
- fuzzy matching only as a fallback, with a confidence threshold
- document parser output such as lines, spans, blocks, tables, and polygons

This is where page numbers, offsets, and bounding boxes should come from.

## Page Marker Pattern

For PDFs and other page-based documents, explicit page markers are often the most robust bridge between model reasoning and deterministic provenance resolution.

Recommended marker shapes:

- `@@page_14@@`
- `<!-- page_14 -->`

Good markers should be:

- easy to parse with a simple regex
- unlikely to occur naturally in source text
- stable across ingestion runs
- tied to the physical page index used by your parser or viewer

This matters because the displayed page label inside a PDF can differ from the actual parser page index due to cover pages, Roman-numbered front matter, appendices, or merged files.

### Why This Pattern Works

Page markers reduce two common failure modes:

1. the model selects the visually displayed footer number instead of the physical page index
2. the resolver has to search the whole document because it has no reliable page prior

When the model returns both a minimal quote and a machine-readable page marker, the resolver can search that page first and widen only when necessary.

### Ingestion Guidance

Inject markers into the model-facing text before chunking or before building the prompt context for grounded answering.

Good defaults:

- place one marker at the start of each page text block
- preserve the same marker in the retrieved chunk shown to the model
- keep markers byte-stable so parsing is trivial
- store both `physical_page` and optional `displayed_page_label` separately if your parser exposes both

Do not replace parser metadata with markers. Use markers as a model-facing page prior, then verify against parser-derived page and geometry data.

### Resolver Flow With Markers

Use this order:

1. parse the page number from the returned marker
2. search for the extracted quote on that physical page
3. if exact match fails, run normalized matching on the same page
4. if still unresolved, widen to nearby pages or the full document with lower confidence
5. map the resolved text span to parser blocks, lines, words, and geometry

This gives you a deterministic page prior without pretending the model knows coordinates.

### Example

Source text sent to retrieval or the model:

```text
@@page_14@@
Enterprise revenue increased 18% year over year.
```

Model-produced evidence:

```json
{
  "source_id": "doc_q4_board_report_v3",
  "quote": "Enterprise revenue increased 18% year over year.",
  "page_marker": "@@page_14@@"
}
```

Resolver behavior:

- parse `14` from `@@page_14@@`
- search page 14 first
- resolve exact span and geometry from parser output
- emit final citation with `page_start=14`, offsets, and highlight metadata

This is especially useful when the PDF footer says something like `Page 1` while the actual parser page is `14`.

## Geometry Guidance

Bounding boxes are usually a document-understanding concern, not an LLM concern.

For PDFs, scans, and forms:

- prefer parser or OCR geometry from the ingestion pipeline
- map matched text to words, lines, or blocks that already have coordinates
- merge adjacent boxes for multi-line highlights
- keep original parser IDs when available so highlights are reproducible

If multiple matches exist, do not guess. Use nearby section headers, page priors from retrieval, or abstain until disambiguated.

## Suggested Schemas

At minimum, a citation object should support:

- `source_id`
- `source_type`
- `title` or `filename`
- `quote`
- `page_start`
- `page_end`
- `char_start`
- `char_end`
- `block_id`
- `bbox` or `polygon`
- `resolver_confidence`

You do not need every field for every source type, but the schema should allow exact provenance when it exists.

### Example: grounded answer shape

```json
{
  "answer": "Revenue grew 18% year over year in the enterprise segment.",
  "citations": [
    {
      "source_id": "doc_q4_board_report_v3",
      "source_type": "pdf",
      "title": "Q4 Board Report",
      "quote": "Enterprise revenue increased 18% year over year.",
      "page_start": 14,
      "page_end": 14,
      "char_start": 4821,
      "char_end": 4866,
      "block_id": "p14_para3",
      "bbox": [0.14, 0.32, 0.81, 0.38],
      "resolver_confidence": 0.97
    }
  ],
  "answer_status": "grounded"
}
```

## Matching Heuristics

Prefer this fallback order:

1. exact text match in the retrieved page or section
2. normalized exact match in the retrieved page or section
3. exact match in the full source document
4. fuzzy match in a bounded local window
5. unresolved citation with abstention or degraded UX

Useful normalizations:

- collapse repeated whitespace
- normalize Unicode quotes and dashes
- strip footnote markers
- join hyphenated line breaks from PDF extraction
- strip or ignore injected page markers before final quote matching when they are adjacent to the evidence span
- preserve enough fidelity that you still know which exact text was matched

Never silently upgrade a weak fuzzy match into a precise-looking citation.

## UX Guidance

Design the UI to expose provenance cleanly:

- inline citation marker in the answer
- hover or side panel with the quote and source title
- click-through to page or document anchor
- exact highlight when geometry exists
- graceful fallback to page or section jump when geometry does not exist

Users trust citations more when they can inspect the exact supporting text quickly.

## Eval Rules

Evaluate citations separately from answer quality.

Measure at least:

1. citation presence rate
2. citation correctness rate
3. citation granularity: source-only vs chunk vs exact text vs geometry
4. quote fidelity: whether the displayed quote actually appears in the source version
5. resolution success rate: how often extracted evidence is mapped to exact provenance
6. degradation behavior when exact provenance is missing or ambiguous

Add hard cases for:

- repeated phrases appearing on multiple pages
- OCR noise
- tables and footnotes
- cross-page paragraphs
- near-duplicate document versions
- multilingual or mixed-format corpora

## TypeScript and Python

- TypeScript: keep citation objects explicit and UI-ready, but store display formatting separately from provenance fields.
- Python: model extracted evidence and resolved citations as separate Pydantic types so failures in the resolver are visible.
- In both stacks, separate semantic evidence extraction from deterministic citation resolution in code structure and traces.

## Project Notes

- For retrieval architecture, chunking, and grounded answer generation, also read `subskills/retrieval.md`.
- For trust, contradiction handling, or review routing that depends on provenance quality, also read `subskills/confidence.md`.
- For schema contracts and structured citation objects, also read `subskills/schema-design.md`.
- For audits, failure analysis, and citation eval datasets from traces, also read `subskills/tracing.md` and `subskills/safety-evals.md`.

## Sources

- https://docs.anthropic.com/en/docs/build-with-claude/citations (last accessed 19.04.2026)
- https://claude.com/blog/introducing-citations-api (last accessed 19.04.2026)
- https://developers.openai.com/api/docs/guides/tools-file-search (last accessed 19.04.2026)
- https://ai.google.dev/gemini-api/docs/google-search (last accessed 19.04.2026)
- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/GroundingMetadata (last accessed 19.04.2026)
- https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/concept-model-overview?view=doc-intel-4.0.0 (last accessed 19.04.2026)
- https://docs.aws.amazon.com/textract/latest/dg/text-location.html (last accessed 19.04.2026)
