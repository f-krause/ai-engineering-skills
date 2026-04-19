# Mistral Caching

Use this file when the workload targets Mistral directly and you need to decide whether the provider offers prompt caching or whether you need to own caching yourself.

## Current documented state

I did not find official Mistral documentation for a first-class prompt caching feature comparable to OpenAI, Anthropic, or Gemini.

What Mistral does document today:

- `prediction` through Predicted Outputs, which is an output-side latency optimization for cases where much of the response is already known.
- `prefix`, which prepends content to the assistant response and is not prompt caching.

## What this means

- Do not assume Mistral offers documented provider-side prompt or context caching.
- Treat repeated long-input reuse as an application concern unless current Mistral docs explicitly say otherwise.
- Use `prediction` only when most of the output is already known, such as code edits or template rewrites.

## Recommended architecture

For Mistral-heavy systems, plan on your own caches:

- Response caching for deterministic or low-variance calls.
- Document preprocessing caches for OCR, parsing, chunking, and embeddings.
- Artifact caches for extracted schemas or normalized intermediate representations.

## Sources

- https://docs.mistral.ai/capabilities/predicted_outputs (last accessed 17.04.2026)
- https://docs.mistral.ai/capabilities/completion/usage (last accessed 17.04.2026)
- https://docs.mistral.ai/models/mistral-large-2-1-24-11 (last accessed 17.04.2026)
