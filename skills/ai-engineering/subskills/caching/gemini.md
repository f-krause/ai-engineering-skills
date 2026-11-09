# Gemini Caching

Use this file when the workload targets the Gemini API and repeatedly reuses the same large context, files, or system instructions.

## Model

Gemini exposes two different caching models:

- Implicit caching: automatic, heuristic, no guaranteed savings.
- Explicit caching: manual cache objects with guaranteed savings semantics.

## Implicit caching

- Google documents implicit caching as enabled by default for Gemini 2.5 models.
- To improve hit rates, place large common content at the beginning of the prompt and send similar-prefix requests close together in time.
- Cache-hit details appear in `usage_metadata`.
- Minimum thresholds vary by model. Google currently documents 1024 tokens for Gemini 2.5 Flash and 4096 for Gemini 2.5 Pro.

## Explicit caching

- Gemini lets you create a `CachedContent` resource, then reference it from later requests.
- `CachedContent` holds immutable `contents`, `systemInstruction`, and optionally tools. Its resource schema does not include `responseSchema`; keep the large document in `contents` and set the needed `responseSchema` on each generation request. This permits one cached document to be used with different response schemas, subject to model and API compatibility. Verify hits with `cached_content_token_count`.
- This is a real reusable cache handle, not just prefix reuse heuristics.
- If not set, Google documents TTL as defaulting to 1 hour.
- Gemini exposes cache lifecycle operations to create, get, list, update, and delete cache objects.

## What to do in practice

- Use implicit caching when prompt shaping is enough and guaranteed savings are not required.
- Use explicit caching when you repeatedly reuse the same large corpus, file, transcript, video, or system context and want deterministic cache reuse.
- Track `usage_metadata` and cache object metadata instead of assuming savings.

## Source Notes

Sources for this page live in `sources.md#caching-gemini`.
