# Nebius Token Factory

Use this file when building inference on Nebius Token Factory. It provides an OpenAI-compatible API, but feature support is model- and endpoint-specific.

## Inference and caching

- Token Factory exposes Chat Completions, Responses, embeddings, and rerank endpoints. Its public and dedicated inference endpoints are distinct from Nebius AI Cloud GPU infrastructure.
- Prompt caching is implicit and best-effort on Serverless and Dedicated text-generation endpoints. Keep the same model and exact shared prefix; put stable instructions, tools, examples, or documents before changing questions. There is no documented explicit cache handle, TTL control, or breakpoint.
- Read Chat Completions `usage.prompt_tokens_details.cached_tokens` or Responses `usage.input_tokens_details.cached_tokens`. Serverless may bill actual cache hits at a model-specific cached-input price; Dedicated is billed per GPU hour. No cache-hit rate or lifetime is guaranteed.
- Serverless cache state is shared within a model across organizations, projects, and API keys; Dedicated cache state is customer-isolated. Cached state is not an access-control boundary.
- Nebius documents `response_format` with `json_schema` and `json_object` for supported models. Since it does not document how changing response schemas affects the rendered cache prefix, test cache hits before relying on one document prefix across schemas.

## Files and documents

- The Files API supports upload, list, retrieve, and delete. Its upload `purpose` values are `batch`, `fine-tune`, and `history`. The current Responses reference does not document `input_file` or a file ID as a document input. Do not treat an uploaded file as automatically available to inference or cached in model context.
- For document Q&A, pass supported content in the model request or build retrieval over extracted text. Confirm model-specific document and vision support before promising direct PDF analysis.

## Source Notes

Sources for this page live in `sources.md#caching-nebius`.
