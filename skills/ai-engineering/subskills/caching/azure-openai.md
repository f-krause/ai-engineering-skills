# Azure OpenAI Caching

Use this file when the workload targets Azure OpenAI rather than OpenAI-hosted API endpoints.

## Model

Azure OpenAI documents automatic prompt caching for `gpt-4o` and newer. Controls depend on model family and deployment type.

## How it works

- Eligibility starts at 1024 tokens.
- The first 1024 tokens must match exactly.
- On GPT-5.5 and earlier, additional hits accrue in 128-token increments. This rounding does not apply to GPT-5.6 and later.
- Azure exposes hits through `prompt_tokens_details.cached_tokens`.
- Azure also documents `prompt_cache_key`.
- Prompt caches are not shared between Azure subscriptions.

## Retention

On GPT-5.6 and later, `prompt_cache_options.ttl` supports only `30m`, a minimum lifetime. On earlier models, `prompt_cache_retention` selects in-memory or, where supported, `24h` extended retention; GPT-5.5 defaults to extended retention. Re-check the target deployment's documentation.

## Gaps versus native OpenAI

- Do not assume native OpenAI feature parity.
- GPT-5.6 and later Standard pay-as-you-go deployments support explicit breakpoints and expose `cache_write_tokens`; writes can be charged separately. Provisioned deployments support automatic caching but not the new breakpoints.
- Microsoft states structured-output schemas are prepended to the system message for caching. A changed schema can make a later document prefix miss. Do not assume native OpenAI's append-only schema update works on Azure without verifying model and API support.

## What to do in practice

- Structure prompts exactly as you would for native prefix caching: stable content first, volatile content last.
- Verify behavior with `cached_tokens`.
- Re-check the current Azure doc before promising a specific retention window.

## Source Notes

Sources for this page live in `sources.md#caching-azure-openai`.
