# LLM Calls

Use this subskill for single-step or tightly scoped LLM invocations.

## Decision Rule

Prefer a direct LLM call when all of these are true:

- One prompt can complete the task
- No iterative tool loop is needed
- No irreversible side effects depend on the model alone
- Success can be checked with schema validation and a small set of assertions

If the task needs runtime tool selection or multiple adaptive steps, read `subskills/agents.md`.

## Best Practices

1. Start with a strict output contract. TypeScript should default to Zod. Python should default to Pydantic.
2. Keep instructions explicit and short. Use directives and constraints, not essays.
3. Separate system instructions from user data, retrieved context, and tool output.
4. Prefer structured output over regex parsing whenever downstream code depends on the result.
5. Keep call options minimal. Set only the parameters that materially change behavior.
6. For non-creative extraction, classification, normalization, and other deterministic backend workflows, set `temperature` to `0`.
7. Only use `temperature > 0` when the product wants flexibility, user-facing variation, or creative generation. If you need that behavior, prefer the provider default unless there is a clear reason to override it.
8. Use streaming for interactive UX. Use non-streaming structured generation for backend steps that need deterministic validation.
9. Design for provider rate limits from the start. Consider RPM, TPM, concurrency caps, and burst limits when choosing model, batching strategy, and prompt size.
10. Catch provider throttling errors such as HTTP 429 or equivalent SDK rate-limit exceptions. Retry only for transient failures, not for permanent request errors.
11. Use bounded backoff with jitter for retryable LLM failures. Prefer exponential or stepped waits such as about 30 seconds, then 60 seconds, then a final longer delay if the product can tolerate it. Honor `Retry-After` headers when available.
12. Keep retries finite and observable. Log the provider, model, attempt count, delay, and failure reason, and surface a clear failure path when the retry budget is exhausted.
13. Add a repair path for malformed output: re-run with the same schema plus the validation failure, or fail closed if the step is safety-critical.
14. Record prompt version, schema version, model ID, and failure mode together.
15. Keep examples perfect and sparse. One bad example is worse than none.
16. Default to the provider already established by the project. If you are starting greenfield and there is no constraint, OpenAI is a reasonable starting default.

## Reused Context and Provider Caching

Caching does not mean the same thing everywhere. The main patterns are:

- Automatic prefix caching: the provider reuses computation when the beginning of the prompt is identical across requests.
- Explicit cache objects or breakpoints: you tell the provider what to cache and then reference it later.
- Application-layer caching: you store full responses or preprocessed artifacts yourself. This is not provider KV or prefix caching.

If many requests reuse the same long file, system prompt, tool schema, examples, or image set, design for provider cache hits before building app-level deduplication. In practice:

- Put the most stable content first and move per-request variables to the end.
- Keep tool definitions, structured-output schemas, examples, and image settings byte-stable across requests when the provider requires exact matches.
- When parallelizing many calls, consider cache-aware scheduling. Group or order work by shared document or shared context when that improves prefix or prompt-cache reuse at the provider.
- Log provider-specific cache hit fields so you can confirm the optimization is real instead of assumed.
- Warm the cache before high fan-out workflows when the provider only makes a new cache entry visible after the first request starts returning.
- Separate provider prompt caching from your own response caches and document preprocessing caches. In production you often need all three layers.

This means the cheapest execution order is not always the most obvious one. For example, processing tasks grouped by document can be cheaper than processing them strictly by user request order when the provider reuses long shared prefixes effectively.

### Provider files

Read the matching caching file instead of relying on memory:

- OpenAI: `subskills/caching/openai.md`
- Anthropic API: `subskills/caching/anthropic.md`
- Gemini API: `subskills/caching/gemini.md`
- Mistral API: `subskills/caching/mistral.md`
- Azure OpenAI: `subskills/caching/azure-openai.md`
- Azure Claude: `subskills/caching/azure-claude.md`
- Azure Mistral: `subskills/caching/azure-mistral.md`

## Prompt Shape

Use this structure:

- Stable system instructions for role, constraints, and tool policy
- User task or app event payload
- Optional structured context block with bounded, relevant facts
- Structured output schema or tool schema

Do not mix instructions into retrieved documents or tool results.

## TypeScript and Python

- TypeScript: use Zod for request and response shapes, especially when the result feeds tools, UI, or persistence.
- Python: use Pydantic `BaseModel` and `Annotated` constraints for bounded values and structured parsing.
- In both stacks, keep prompt-layer schemas separate from persistence-layer schemas.

## Project Notes

- If the project uses a framework-specific AI SDK or wrapper, read the corresponding local companion skill or docs as well.
- If this call feeds a tool, structured output, or persisted object, also read `subskills/schema-design.md`.
- If prompt or generation behavior changes, run the project's AI-focused regression tests if they exist.

## Sources

- https://www.philschmid.de/agent-skills-tips (last accessed 17.04.2026)
- https://developers.openai.com/api/docs/guides/prompt-caching (last accessed 17.04.2026)
- https://platform.claude.com/docs/en/build-with-claude/prompt-caching (last accessed 17.04.2026)
- https://ai.google.dev/gemini-api/docs/caching (last accessed 17.04.2026)
- https://docs.mistral.ai/capabilities/predicted_outputs (last accessed 17.04.2026)
- https://docs.mistral.ai/models/mistral-large-2-1-24-11 (last accessed 17.04.2026)
- https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/prompt-caching?view=foundry-classic (last accessed 17.04.2026)
- https://learn.microsoft.com/en-us/azure/foundry/foundry-models/how-to/use-foundry-models-claude (last accessed 17.04.2026)
- https://learn.microsoft.com/en-us/azure/ai-foundry/foundry-models/concepts/models-from-partners (last accessed 17.04.2026)
- https://platform.claude.com/docs/en/build-with-claude/structured-outputs (last accessed 17.04.2026)
- https://platform.claude.com/docs/en/about-claude/models/choosing-a-model (last accessed 17.04.2026)
- https://ai-sdk.dev/docs/foundations/tools (last accessed 17.04.2026)
