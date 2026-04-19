# Azure Mistral Caching

Use this file when the workload targets Mistral models hosted through Azure AI Foundry.

## Current documented state

I did not find official Microsoft or Mistral documentation exposing a provider-side prompt caching feature for Azure-hosted Mistral models.

Current Microsoft model-capability pages for Mistral list model families, input and output limits, tool-calling support, and response formats, but not prompt caching.

## What this means

- Do not assume Azure OpenAI caching rules apply to Azure-hosted Mistral models.
- Do not assume that "Foundry supports caching" means all providers in Foundry expose the same caching surface.
- Treat provider-side prompt caching as unavailable or not customer-visible unless current Azure or Mistral docs explicitly document it.

## Recommended architecture

If you need performance or cost wins around Azure-hosted Mistral workloads, look first at:

- Response caching for deterministic or low-variance operations.
- Document preprocessing caches for OCR, parsing, chunking, and embeddings.
- Prompt-size reduction, batching, or output-side optimizations that the specific Mistral model card documents.

## Sources

- https://learn.microsoft.com/en-us/azure/ai-foundry/foundry-models/concepts/models-from-partners (last accessed 17.04.2026)
- https://learn.microsoft.com/en-us/azure/ai-foundry/how-to/deploy-models-mistral-codestral (last accessed 17.04.2026)
