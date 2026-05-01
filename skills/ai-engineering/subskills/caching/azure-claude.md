# Azure Claude Caching

Use this file when the workload targets Anthropic Claude models through Azure AI Foundry rather than the native Anthropic endpoint.

## Model

Claude on Azure AI Foundry should be treated as Anthropic-style caching, not Azure OpenAI-style caching.

## Why

- Microsoft Foundry documents prompt caching as a supported Claude capability.
- Anthropic's prompt-caching docs explicitly note behavior that applies to both the Claude API and Azure AI Foundry preview, including workspace-level cache isolation changes.

## Practical interpretation

- Use Anthropic's `cache_control` model and TTL semantics as the primary mental model.
- Prefer Anthropic's own prompt-caching docs for operational behavior such as breakpoint rules, lookback window, and TTL handling.
- Use Microsoft Foundry docs to confirm the specific Azure hosting surface, supported Claude families, auth path, and deployment constraints.

## What to do in practice

- For large shared tools, system prompts, or long structured conversations, follow the Anthropic guidance in `subskills/caching/anthropic.md`.
- Do not reuse Azure OpenAI assumptions like `prompt_cache_key` or Azure OpenAI retention wording for Claude.

## Source Notes

Sources for this page live in `sources.md#caching-azure-claude`.
