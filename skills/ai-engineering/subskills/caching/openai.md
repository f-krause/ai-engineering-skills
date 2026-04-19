# OpenAI Caching

Use this file when the workload repeatedly sends the same long prompt prefix to the native OpenAI API.

## Model

OpenAI uses automatic prompt caching on recent models, `gpt-4o` and newer. This is automatic prefix caching, not an explicit cache object API.

## How it works

- Cache hits require an exact shared prompt prefix.
- Eligibility starts at 1024 prompt tokens.
- After the first 1024 cached tokens, hits accrue in 128-token increments.
- The provider exposes hits in `usage.prompt_tokens_details.cached_tokens`.
- `prompt_cache_key` helps routing locality for workloads with many repeated long prefixes.

## Retention

- Default retention is in-memory caching.
- OpenAI documents cached prefixes as generally active for about 5 to 10 minutes of inactivity, up to 1 hour.
- Some supported models also allow `prompt_cache_retention: "24h"` for extended retention.

## What to do in practice

- Put stable system instructions, examples, tool definitions, images, and schemas first.
- Put user-specific or request-specific content last.
- Treat caching as prompt-structure work, not as a separate cache object feature.
- Verify the optimization by logging `cached_tokens`.

## What this is not

- `prompt_cache_key` is not a reusable cache handle.
- OpenAI prompt caching does not replace your own response cache or document preprocessing cache.

## Sources

- https://developers.openai.com/api/docs/guides/prompt-caching (last accessed 17.04.2026)
- https://developers.openai.com/api/reference/chat/create (last accessed 17.04.2026)
