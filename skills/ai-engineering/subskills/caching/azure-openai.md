# Azure OpenAI Caching

Use this file when the workload targets Azure OpenAI rather than OpenAI-hosted API endpoints.

## Model

Azure OpenAI documents automatic prompt caching for Azure OpenAI models `gpt-4o` or newer. This is automatic prefix caching, similar in shape to native OpenAI, but not full feature parity.

## How it works

- Eligibility starts at 1024 tokens.
- The first 1024 tokens must match exactly.
- Additional cache hits accrue in 128-token increments.
- Azure exposes hits through `prompt_tokens_details.cached_tokens`.
- Azure also documents `prompt_cache_key`.
- Prompt caches are not shared between Azure subscriptions.

## Retention

Azure documentation currently differs by documentation surface:

- The Azure AI services documentation says caches are typically cleared after 5 to 10 minutes of inactivity and always removed within 1 hour.
- The Microsoft Foundry prompt-caching page updated on April 14, 2026 says prompt caches are cleared within 24 hours.

Treat retention wording as deployment-surface-sensitive and re-check the current Microsoft doc for the exact environment you are using.

## Gaps versus native OpenAI

- Do not assume native OpenAI feature parity.
- Microsoft Q&A currently states Azure OpenAI does not support OpenAI's `prompt_cache_retention` extended retention parameter.

## What to do in practice

- Structure prompts exactly as you would for native prefix caching: stable content first, volatile content last.
- Verify behavior with `cached_tokens`.
- Re-check the current Azure doc before promising a specific retention window.

## Source Notes

Sources for this page live in `sources.md#caching-azure-openai`.
