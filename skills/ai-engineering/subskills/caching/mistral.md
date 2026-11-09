# Mistral Caching

Use this file for repeated prefixes on Mistral's native Chat Completions API.

## Current behavior

- Mistral documents prompt caching for repeated prompt prefixes. Send the same `prompt_cache_key` on related requests and preserve the beginning of `messages` exactly. The key improves the chance of a hit; it does not guarantee one.
- Cached prompt tokens are billed at 10% of ordinary input price. `usage.prompt_tokens_details.cached_tokens` reports hits. Cache blocks are 64 tokens, so reported hits are multiples of 64.
- Keep shared system instructions, tool definitions, and documents before the changing question. Append conversation turns instead of rewriting earlier ones.
- Mistral does not document explicit breakpoints or a reusable cache object here. If the response schema or tool configuration changes, measure whether the document prefix still hits; do not infer rendered prompt order from the API request order.
- `prediction` is a separate output-side latency optimization, not prompt caching.

## Source Notes

Sources for this page live in `sources.md#caching-mistral`.
