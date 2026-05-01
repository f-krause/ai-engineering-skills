# OpenAI Web Search

Use this subskill when adding or changing OpenAI hosted web search, especially with Responses API structured outputs, URL citations, source lists, domain filters, or current-public-information workflows.

This file is OpenAI-specific. For general retrieval architecture also read `retrieval.md`; for provenance UX and citation storage also read `citations.md`; for Pydantic or Zod schema design also read `schema-design.md`.

## Contents

- Decision Rule: lines 17-22
- Integration Defaults: lines 23-34
- Citations: lines 35-47
- Structured Outputs With Web Search: lines 48-139
- Claim-Level Citation Mapping: lines 140-166
- Source Quality Rules: lines 167-174
- Source Notes: lines 175-177

## Decision Rule

Use OpenAI hosted `web_search` when the answer depends on broad, public, fast-changing, or open-world information.

Do not use web search when the source of truth is a tenant-private corpus, uploaded files, internal databases, or a fixed document set. Use scoped file search, retrieval, database tools, or full context instead.

## Integration Defaults

1. For new integrations, use the Responses API with `tools=[{"type": "web_search"}]`.
2. Keep `web_search_preview` only for legacy code. It lacks newer controls such as `filters` and `external_web_access`.
3. Use Chat Completions search models only when preserving an existing Chat Completions integration. In Chat Completions, search models search before every answer; in Responses, web search is a tool the model can choose to use.
4. Use a fast/non-reasoning setup for simple lookups; use a reasoning model and higher reasoning effort for multi-hop investigation; use deep research/background mode only for long-running reports.
5. Set `search_context_size` intentionally: `low` for simple facts, `medium` as the normal default, `high` for detail-heavy synthesis. It is not an exact token or source-count control.
6. Use `filters.allowed_domains` or `filters.blocked_domains` when source quality matters. Domains omit the URL scheme and include subdomains.
7. Add approximate `user_location` only when local relevance is product-relevant, such as restaurants, weather, local rules, or events.
8. Set `external_web_access: false` only when the workflow must avoid live fetching and can tolerate cached/indexed results.
9. Use `include=["web_search_call.action.sources"]` when audit logs need every consulted URL, not just the URLs cited inline.

## Citations

OpenAI web search returns citations outside the model's normal prose contract:

- Responses API output contains `web_search_call` items plus a final `message`.
- The message `output_text` contains `annotations`.
- `url_citation` annotations contain the cited URL, title, and text location.
- `sources`, when included, lists consulted URLs and can be broader than inline citations.

Treat those annotations and sources as code-owned provenance. Do not ask the model to invent source URLs, offsets, or citation objects inside the structured schema unless you validate them against the returned annotations.

When rendering web-backed answers to users, show inline citations clearly and make them clickable.

## Structured Outputs With Web Search

The safe default is:

1. Use Pydantic/Zod for the semantic answer shape.
2. Use OpenAI's `url_citation` annotations as the provenance layer.
3. Store a joined object in application code: `parsed_answer` plus `web_citations` plus optional `web_sources`.
4. If field-level or claim-level citation mapping is required, add deterministic post-processing. Do not rely on the parsed object alone.

One-call pattern:

```python
from typing import Literal

from openai import OpenAI
from pydantic import BaseModel, Field

client = OpenAI()


class Finding(BaseModel):
    claim: str = Field(description="A concise sourced claim")
    freshness: Literal["current", "possibly_stale", "unknown"] = Field(
        description="Freshness assessment"
    )


class WebAnswer(BaseModel):
    status: Literal["answered", "insufficient_evidence", "conflicting_sources"]
    answer: str = Field(description="User-facing answer")
    findings: list[Finding] = Field(description="Key sourced findings")
    missing_information: list[str] = Field(description="What search did not resolve")


response = client.responses.parse(
    model="gpt-5.5",
    tools=[
        {
            "type": "web_search",
            "search_context_size": "medium",
            "filters": {
                "blocked_domains": ["reddit.com", "quora.com"],
            },
        }
    ],
    include=["web_search_call.action.sources"],
    input=[
        {
            "role": "system",
            "content": (
                "Answer only from web search evidence. "
                "If sources conflict or evidence is weak, set the status accordingly."
            ),
        },
        {
            "role": "user",
            "content": "Summarize the latest production guidance for OpenAI web search.",
        },
    ],
    text_format=WebAnswer,
)

answer = response.output_parsed


def extract_url_citations(resp) -> list[dict[str, object]]:
    citations: list[dict[str, object]] = []
    for item in resp.output:
        if getattr(item, "type", None) != "message":
            continue
        for content in getattr(item, "content", []) or []:
            if getattr(content, "type", None) != "output_text":
                continue
            for annotation in getattr(content, "annotations", []) or []:
                if getattr(annotation, "type", None) != "url_citation":
                    continue
                citations.append(
                    {
                        "url": getattr(annotation, "url", None),
                        "title": getattr(annotation, "title", None),
                        "start_index": getattr(annotation, "start_index", None),
                        "end_index": getattr(annotation, "end_index", None),
                    }
                )
    return citations


web_citations = extract_url_citations(response)
```

If a pinned SDK does not support `responses.parse` with the needed tool or include parameters, use `responses.create` with a strict `text.format` JSON schema and parse the JSON into Pydantic yourself.

## Claim-Level Citation Mapping

Structured JSON and URL annotations solve different problems. JSON gives type safety; annotations tell you which URLs the model cited in the raw output text. Annotation offsets may not map cleanly to parsed Pydantic fields after JSON parsing.

Use this escalation path when precise citation mapping matters:

1. First call: use `web_search` to produce a concise, citation-rich text answer and collect annotations/sources.
2. Build a deterministic citation table in code: `source_id`, `url`, `title`, `start_index`, `end_index`.
3. Second call: use structured outputs without web search to transform the text answer plus citation table into your application schema, requiring claim objects to reference only provided `source_id` values.
4. Validate every referenced `source_id` exists and every user-visible cited claim has at least one source.

Example target schema for the second call:

```python
class CitedClaim(BaseModel):
    claim: str
    source_ids: list[str] = Field(description="IDs from the provided citation table")


class CitedWebAnswer(BaseModel):
    status: Literal["answered", "insufficient_evidence", "conflicting_sources"]
    answer: str
    claims: list[CitedClaim]
```

This two-step pattern is more reliable than asking the web-search call to both discover sources and emit final app provenance in one JSON object.

## Source Quality Rules

1. Prefer primary and authoritative domains for medical, legal, financial, regulatory, standards, and API documentation questions.
2. Use domain filters for regulated or high-stakes searches instead of hoping prompt wording will select good sources.
3. Ask for conflict handling explicitly: if reliable sources disagree, surface the disagreement instead of averaging it away.
4. Log search action metadata, cited URLs, consulted sources, model, tool config, prompt/schema version, and timestamp.
5. Evaluate search-backed systems on answer correctness, citation relevance, citation clickability, source quality, freshness, and abstention when evidence is insufficient.

## Source Notes

Sources for this page live in `sources.md#openai-web-search`.
