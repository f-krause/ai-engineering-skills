# Anthropic Caching

Use this file when the workload targets the Anthropic API directly and repeatedly reuses large tools, system prompts, documents, or conversation prefixes.

## Model

Anthropic supports prompt caching through both automatic caching and explicit cache breakpoints.

## How it works

- Automatic caching: add one top-level `cache_control` and Anthropic advances the cache point as the conversation grows.
- Explicit caching: place `cache_control` on individual cacheable blocks for fine-grained control.
- Anthropic builds cacheable hierarchy in this order: `tools`, `system`, then `messages`.
- Cache hits require exact matching of cached prompt segments, including text and images.
- Anthropic documents up to 4 breakpoint slots.
- Anthropic documents an automatic lookback window of about 20 content blocks before an explicit breakpoint.

## Retention and pricing

- Default cache type is `ephemeral` with a 5-minute TTL.
- Anthropic also documents a `1h` TTL.
- Anthropic documents 5-minute cache writes at 1.25x base input price, 1-hour writes at 2x base input price, and cache reads at 0.1x base input price.

## Operational notes

- For parallel fan-out, a cache entry becomes available only after the first response begins.
- Automatic caching and explicit block caching can be combined, but automatic caching uses one of the available breakpoint slots.

## What to do in practice

- Use top-level automatic caching when the whole conversation prefix should keep moving forward.
- Use explicit breakpoints when tools, system prompt, and retrieved context change at different cadences.
- Add a second breakpoint if a growing conversation will push the hot prefix beyond Anthropic's documented lookback window.

## Sources

- https://platform.claude.com/docs/en/build-with-claude/prompt-caching (last accessed 17.04.2026)
