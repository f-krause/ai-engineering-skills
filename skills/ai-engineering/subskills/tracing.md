# Tracing

Use this subskill when adding or changing observability for LLM calls, workflows, agents, tool execution, or evaluation loops. Start with MLflow tracing unless the project already standardizes on a different tracing stack.

## Why Trace

Tracing is not optional for serious AI engineering. If the system makes multiple LLM calls, uses tools, or evolves through prompt and schema changes, traces should exist so humans and AI agents can inspect real executions instead of guessing from code and logs.

Prefer storing traces on local infrastructure so they remain available for debugging, regression analysis, and agent-assisted improvement work.

## Default Recommendation

Use MLflow tracing as the default local tracing stack.

Reasons based on official MLflow docs:

- MLflow tracing is built for LLM and agent observability and captures inputs, outputs, metadata, intermediate steps, token usage, and latency.
- MLflow supports one-line auto tracing for OpenAI and manual spans for custom code.
- MLflow traces are searchable with `mlflow.search_traces()`, which makes them usable by humans and by AI agents that need to inspect past executions.
- MLflow is OpenTelemetry-compatible, so you are not boxed into a dead-end instrumentation model.

## Local Storage Guidance

Store traces locally, but do not default to the legacy file-only store for serious usage.

- Good default for local development: run a local MLflow server and point apps to it with `MLFLOW_TRACKING_URI` or `mlflow.set_tracking_uri(...)`
- Better local default when traces matter: use a local SQL-backed MLflow backend such as SQLite or Postgres so traces stay searchable and scalable
- Avoid relying on the plain local FileStore for trace-heavy workflows: MLflow documents that local File Store search is limited and that FileStore is deprecated as of MLflow 3.6.0

The goal is local ownership of trace data with enough query capability that agents can mine traces for failures, regressions, and candidate eval datasets.

## What To Trace

Trace these boundaries explicitly:

- top-level user request or batch job
- each LLM call
- each tool execution
- routing decisions
- evaluator or critic passes
- retry and fallback branches
- final output and stop reason

Workflows and agents should both emit traces, but with different shapes:

- workflows should look like explicit code-owned stages
- agents should look like bounded observe-plan-act loops

## Python Guidance

Prefer this layering:

1. Start a local MLflow server
2. Set tracking URI and experiment
3. Enable provider auto tracing when available, such as `mlflow.openai.autolog()`
4. Add manual spans around your own functions with `@mlflow.trace` or `mlflow.start_span(...)`
5. Add trace metadata or tags for app version, prompt version, schema version, tenant-safe request labels, and environment

Use `mlflow.tracing.configure(span_processors=[...])` to redact or mask sensitive attributes before export.

## TypeScript Guidance

For OpenAI, use MLflow's JS tracing support and wrap the client with `tracedOpenAI(...)`.

In TypeScript, keep the same logical trace boundaries as Python:

- request root
- model invocation
- tool execution
- orchestration step
- final result

If the integrated wrapper covers only the model call, add explicit app-level instrumentation around the surrounding workflow or agent runner rather than treating provider traces as sufficient.

## Design Rules

1. Trace the real control flow, not just the provider call.
2. Add stable tags for model ID, prompt version, schema version, experiment name, environment, and feature flag variant.
3. Keep trace payloads useful but bounded. Log the relevant structured inputs and outputs, not every raw object in memory.
4. Redact secrets, tokens, passwords, and sensitive tenant data before export.
5. Keep trace naming consistent so queries and dashboards stay useful over time.
6. Make trace search part of debugging and evaluation, not a separate afterthought.

## Agent Improvement Loop

Traces should be easy for AI agents to inspect locally when improving the system. Favor patterns that support:

- querying recent failures with `mlflow.search_traces()`
- extracting representative examples for evals
- comparing prompt or schema versions through tags and metadata
- reviewing tool-call sequences and stop reasons
- identifying latency or token cost regressions

If an agent cannot find or query past executions locally, the tracing setup is incomplete.

## Minimal Patterns

### Python

- use `mlflow.openai.autolog()` for OpenAI calls
- use `@mlflow.trace` on workflow steps, tools, and agent runners
- use `mlflow.start_span(...)` for fine-grained nested spans
- use `mlflow.search_traces()` and `mlflow.get_trace(...)` for analysis

### TypeScript

- use `@mlflow/openai` and wrap the client with `tracedOpenAI(new OpenAI())`
- keep request-level orchestration code structured so manual instrumentation can be added around it
- persist traces to a local MLflow server, not just ephemeral console logs

## Sources

- https://mlflow.org/docs/latest/genai/tracing/ (last accessed 17.04.2026)
- https://mlflow.org/docs/latest/genai/tracing/quickstart (last accessed 17.04.2026)
- https://mlflow.org/docs/latest/genai/tracing/integrations/listing/openai (last accessed 17.04.2026)
- https://mlflow.org/docs/latest/api_reference/python_api/mlflow.html (last accessed 17.04.2026)
- https://mlflow.org/docs/latest/api_reference/python_api/mlflow.tracing.html (last accessed 17.04.2026)
- https://mlflow.org/docs/latest/genai/tracing/search-traces/ (last accessed 17.04.2026)
