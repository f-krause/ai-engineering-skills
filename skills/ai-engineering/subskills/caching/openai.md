# OpenAI Caching

Use this file when the workload repeatedly sends the same long prompt prefix to the native OpenAI API.

## Model

OpenAI prompt caching is model-specific. GPT-5.6 and later support implicit and explicit breakpoints; older supported models use implicit caching.

## How it works

- Cache hits require an exact shared prompt prefix.
- GPT-5.6 and later require a 1,024-token visible prefix. Older models have a setting-dependent minimum and report hits in 128-token increments.
- On GPT-5.6 and later, `prompt_cache_options.mode: "explicit"` uses only marked `prompt_cache_breakpoint` boundaries. Without one, no cache is written. A request can write up to four breakpoints.
- The provider exposes hits in `usage.prompt_tokens_details.cached_tokens`.
- `prompt_cache_key` helps routing on older models. On GPT-5.6 and later it is optional for cache accounting and partitioning, not a cache handle.

## Retention

- GPT-5.6 and later default to a 30-minute minimum lifetime; Responses can request `prompt_cache_options.ttl: "12h"`. Writes have a higher input rate, so compare write cost against later reads.
- Earlier models use implicit caching and older `prompt_cache_retention` controls. Do not transfer one family's retention rules to another.

## What to do in practice

- Put stable system instructions, examples, tool definitions, images, and schemas first.
- Put user-specific or request-specific content last.
- Changing top-level `text.format` can prevent reuse of a later document prefix. On supported GPT-6 and later Responses models, keep the original top-level format stable and append a `configuration_update` with the new schema before the next user message. This preserves the earlier prefix in an append-only conversation.
- On GPT-5.6 and later, place an explicit breakpoint at the end of a reusable document block when the request shape permits. A breakpoint cannot rescue a prefix changed by earlier tools, instructions, or format settings.
- Verify the optimization by logging `cached_tokens`.

## What this is not

- `prompt_cache_key` is not a reusable cache handle.
- OpenAI prompt caching does not replace your own response cache or document preprocessing cache.

## Source Notes

Sources for this page live in `sources.md#caching-openai`.
