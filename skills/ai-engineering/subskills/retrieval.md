# Retrieval and Grounding

Use this subskill when adding or changing file search, knowledge tools, RAG, vector databases, reranking, chunking, or grounded answer generation.

## Decision Rule

Do not default to a vector database.

Choose retrieval architecture in this order:

1. Full context: if the relevant corpus is small enough to fit comfortably in the model context, send the whole document or bounded slice directly.
2. Search tool: if the data is dynamic, broad, or open-world, prefer a search tool over pre-indexing static embeddings.
3. Document-scoped retrieval: if answers must come from one known tenant, customer, report, or case file, search only that scope instead of a global index.
4. Hybrid RAG: if the corpus is too large for context and must be queried repeatedly, use retrieval with lexical plus semantic search.

Long context plus provider caching is often simpler and more reliable than RAG for small or medium corpora. RAG earns its complexity only when scale or latency require it.

This subskill is about finding and preparing evidence. If the change is mainly about mapping answers back to exact evidence locations, read `subskills/citations.md`. If the change is mainly about trust, review routing, or abstention based on evidence quality, read `subskills/confidence.md`.

## Architecture Rules

1. Evaluate retrieval separately from generation. If the retriever misses the evidence, prompt tuning the answer step will not fix the system.
2. Preserve source metadata from the start: source ID, page, section, chunk ID, URL, or document timestamp. Treat grounding metadata as part of the contract.
3. Scope retrieval tightly by tenant, customer, document set, or case whenever cross-entity contamination is possible.
4. Prefer exact filters and lexical search whenever queries include identifiers, codes, dates, product names, or legal clause references.
5. If you use embeddings, combine them with BM25 or equivalent lexical retrieval rather than relying on embeddings alone.
6. Rerank the top candidates before final answer generation when answer accuracy matters.
7. Return compact retrieval results to the model: short excerpts plus metadata, not giant raw dumps.
8. Keep retrieval as an explicit tool boundary in agentic systems. Do not hide a large implicit knowledge dump inside the prompt when the model should reason over cited evidence.
9. Make the final answer cite the evidence it actually used.
10. If the product needs exact evidence locations, page highlights, or bounding boxes, hand off to `subskills/citations.md` rather than overloading retrieval logic with provenance resolution.

## Chunking and Document Prep

Chunk quality matters as much as the vector store choice.

- Chunk by coherent units such as paragraphs, sections, or page-local spans, not blind token windows only.
- Preserve page numbers and section headers in metadata.
- Contextualize chunks when local text loses meaning without the parent document context.
- Treat tables, forms, and PDFs as special cases. A poor parser destroys downstream retrieval quality.
- Serialize large tables into smaller text records when the answer depends on row or attribute lookups.

When the source is a PDF-heavy enterprise corpus, parsing and text cleanup often matter more than the embedding model.

## Grounded Answer Design

For answering over retrieved evidence:

1. Retrieve candidate evidence.
2. Rerank or filter.
3. Ask the model to answer only from the retained evidence.
4. Require a structured answer with citation fields.
5. If evidence is insufficient, return `insufficient_evidence` or escalate instead of guessing.

Prefer answer schemas like:

- `answer`
- `citations`
- `answer_status`
- `missing_information` when the evidence is incomplete

This keeps grounded answering auditable in B2B systems. If grounded evidence should also drive trust levels, abstention, or review routing, pair this file with `subskills/confidence.md`.

## Retrieval Evals

Measure at least two layers:

1. Retriever quality: recall at K, whether the evidence-bearing chunk or page was surfaced.
2. End-to-end answer quality: correctness, citation quality, and abstention behavior.

Add failure-driven cases for:

- exact identifiers and numeric lookups
- ambiguous company or customer names
- large tables
- multilingual variants
- stale or conflicting documents
- insufficient-evidence questions

If the product depends on document references, eval the references directly instead of grading only the prose answer.

## TypeScript and Python

- TypeScript: keep retrieval result objects typed and compact, including `documentId`, `page`, `excerpt`, and any score fields that downstream code uses.
- Python: model retrieval results and grounded answers with Pydantic so citations and abstention states are validated.
- In both stacks, keep retriever code independent from answer-generation code so each layer can be tuned and evaluated separately.

## Project Notes

- If retrieval feeds a tool-calling agent, also read `subskills/agents.md`.
- If final answers or tool choices depend on grounded evidence, also read `subskills/schema-design.md`.
- For inline citations, exact text provenance, or PDF highlight mapping, also read `subskills/citations.md`.
- If answer quality changes after retrieval changes, update both retrieval and end-to-end evals.

## Sources

- https://www.anthropic.com/engineering/contextual-retrieval (last accessed 19.04.2026)
- https://docs.anthropic.com/en/docs/build-with-claude/search-results (last accessed 19.04.2026)
- https://www.anthropic.com/news/introducing-citations-api (last accessed 19.04.2026)
- https://abdullin.com/ilya/how-to-build-best-rag/ (last accessed 19.04.2026)
- https://abdullin.com/llm-benchmarks (last accessed 19.04.2026)
