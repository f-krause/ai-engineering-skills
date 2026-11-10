# Gemini Caching

Use this file when the workload targets the Gemini Developer API or Gemini Enterprise Agent Platform (formerly Vertex AI) and repeatedly reuses large context, files, or system instructions.

## Model

Gemini exposes two different caching mechanisms:

- Implicit caching: automatic prefix reuse. A hit is best-effort; no cache resource is created by the caller.
- Explicit caching: a caller-created `CachedContent` resource referenced by name in later requests. The reused content receives the documented discount, with storage charges while the resource exists.

The storage tier is a separate choice from the caching mechanism. On Enterprise Agent Platform, implicit caching can use RAM or durable storage; explicit cache resources are intentionally stored for their configured lifetime.

## Implicit caching

- Google documents implicit caching as enabled by default for Gemini 2.5 and newer models. Check the selected model's current minimum: the Developer API now lists 2,048 tokens for Gemini 2.5 Flash and Pro, and higher thresholds for newer models.
- To improve hit rates, place large common content at the beginning of the prompt and send similar-prefix requests close together in time.
- Cache-hit details appear in response usage metadata; field naming differs between GenerateContent and Interactions API responses.
- On the Developer API, implicit cache data is documented as in-memory only, project-isolated, and evicted within 24 hours. On Enterprise Agent Platform, supported models have in-memory caching by default and some also have durable caching by default. Durable caching stores derived key-value data encrypted at rest when RAM capacity is exhausted; it is project-isolated and deleted within 24 hours, often sooner.
- Enterprise Agent Platform can set project `cacheConfig.retentionConfig.retentionType` to `EPHEMERAL` to keep only in-memory caching, or set `disableCache: true` to turn off both implicit tiers. Read the existing project cache setting before changing it. This control is for the Google Cloud project, not a per-request Gemini Developer API flag.

## Explicit caching

- Gemini lets you create a `CachedContent` resource, then reference it from later requests.
- `CachedContent` holds immutable `contents`, `systemInstruction`, and optionally tools. Its resource schema does not include `responseSchema`; keep the large document in `contents` and set the needed `responseSchema` on each generation request. This permits one cached document to be used with different response schemas, subject to model and API compatibility. Verify hits with `cached_content_token_count`.
- This is a real reusable cache handle, not just prefix reuse heuristics.
- If not set, Google documents TTL as defaulting to 1 hour.
- Gemini exposes cache lifecycle operations to create, get, list, update, and delete cache objects.
- Explicit caching is available through GenerateContent, not the Interactions API. A file upload is separately stored and is not itself an explicit context cache.

## Enterprise endpoint and zero data retention

- The current Google Gen AI SDK selects Enterprise Agent Platform with Python `genai.Client(enterprise=True, project=..., location=...)` or the corresponding `GOOGLE_GENAI_USE_ENTERPRISE=true` environment setting. `vertexai=True` is the legacy alias. This chooses the Google Cloud endpoint; it does not itself enable zero data retention.
- For Google models on Enterprise Agent Platform, zero data retention requires checking the project's abuse-monitoring terms or approval, keeping request-response logging disabled, setting Interactions API `store=false`, avoiding features with unavoidable retention (notably Google Search and Maps grounding), and avoiding explicit caches when stored context is disallowed. Use `EPHEMERAL` for RAM-only implicit caching or disable caching entirely under the project's policy.
- The Developer API has separate ZDR terms and approval. Do not infer enterprise retention controls from a Developer API key or assume the endpoint switch alone changes logging or file-storage behavior. Verify the project's configuration and applicable Google Cloud terms before claiming ZDR.

## What to do in practice

- Use implicit caching when prompt shaping is enough and guaranteed savings are not required.
- Use explicit caching when you repeatedly reuse the same large corpus, file, transcript, video, or system context and want deterministic cache reuse.
- Track `usage_metadata` and cache object metadata instead of assuming savings.
- If data must never be stored at rest, choose the appropriate endpoint and project policy first, then disable durable caching and avoid explicit caches and persistent file uploads.

## Source Notes

Sources for this page live in `sources.md#caching-gemini`.
