# Schema Provider Support

Use this reference only when provider-specific structured-output behavior matters. Verify current provider docs before depending on a constraint in production.

## Portable Baseline

Current provider structured-output pipelines all speak JSON Schema, but not the same JSON Schema. Treat Pydantic and Zod as authoring tools, not as proof that every constraint will be enforced by the model provider.

As of 2026-05-01, the portable baseline across OpenAI, Gemini, Claude, and Mistral is:

- object, array, string, integer, number, boolean, and null-compatible fields
- `properties`, `required`, `items`, concise `description`, and `additionalProperties: false`
- `enum` or language-level `Literal[...]` / `z.enum(...)` for controlled choices
- nested branch schemas for routing, preferably with a literal discriminator field
- app-side validation after parsing, even when provider-side constrained decoding is enabled

Use provider-specific constraints only when the provider and target model explicitly support them, and keep validation in code as the final authority.

## Provider Snapshot

| Feature | OpenAI | Gemini | Claude | Mistral |
| --- | --- | --- | --- | --- |
| Pydantic / Zod helpers | Native Python Pydantic and JS Zod helpers. Root schema must be an object, so wrap top-level unions. | Python Pydantic and JS Zod via JSON Schema conversion. | Python Pydantic and TS Zod helpers for JSON outputs; raw schemas for some SDKs. | Python Pydantic and TS Zod accepted by SDK parse helpers; raw JSON Schema accepted in `json_schema` mode. |
| Required / optional | All fields must be required. Model optionality as required nullable fields, such as `str | None` or `z.string().nullable()`. | `required` controls mandatory fields. Optional fields are supported; nullable fields use a type array containing `null`. | Optional fields are supported but count toward schema complexity limits. Required fields are emitted before optional fields. | Supports standard `required` in supplied JSON Schema; verify model behavior with evals for important optional fields. |
| Literals / enums | Supported. Good for route choices, stop reasons, and confidence buckets. | Supported for strings and numbers. | Supported through JSON Schema and SDK helpers. | Supported through JSON Schema and SDK helpers. |
| Discriminated unions / `anyOf` | `anyOf` is supported inside an object, but not as the root schema. | JSON Schema supports type arrays and a documented subset; test unions or `anyOf` before relying on them. | Union types are supported but expensive; current limits allow 16 union parameters across strict schemas in one request. | Custom structured outputs accept JSON Schema; docs do not publish a full keyword matrix, so test complex unions. |
| Numeric min / max | Supported for base structured-output models: `minimum`, `maximum`, exclusive bounds, and `multipleOf`. Not supported for fine-tuned models. | Supports inclusive `minimum` and `maximum` for numbers and integers. | SDKs may strip `minimum` and `maximum`, add the constraint to descriptions, then validate the original schema locally. Do not rely on provider-side numeric bounds. | Not documented in a provider keyword matrix. Use local validation for business-critical numeric bounds. |
| Array min / max | Supports `minItems` and `maxItems` for base structured-output models. Not supported for fine-tuned models. | Supports `minItems`, `maxItems`, `items`, and `prefixItems`. | Treat array bounds as local-validation constraints unless the exact target model and SDK path are verified. | Not documented in a provider keyword matrix. Use local validation for business-critical array bounds. |
| String constraints | Supports `pattern` and selected `format` values; `minLength` and `maxLength` are not in the supported list. Fine-tuned models do not support `pattern` or `format`. | Supports `enum` and selected `format` values such as date and time; length and regex constraints are not documented as supported. | Simple regex `pattern` has documented support; unsupported constraints such as `minLength` and `maxLength` may be stripped by SDK helpers and validated locally. | Not documented in a provider keyword matrix. Prefer enums and local validation over regex or length constraints. |
| Object strictness | `additionalProperties: false` is required on objects. | `additionalProperties` is supported and can be boolean or a schema. | SDK helpers add `additionalProperties: false`; use it explicitly in raw schemas. | Use `additionalProperties: false`; set `strict: true` when the SDK or API schema exposes it. |
| Ordering | Output follows schema key order. | Output follows schema key order; Gemini 2.0 also needs explicit `propertyOrdering`. | Required fields are emitted before optional fields, each in schema order. | Do not rely on ordering unless verified; design parsers to be order-insensitive. |
| Failure cases | Safety refusals may return a refusal shape rather than your schema; unsupported schema keywords error when strict mode is used. | Unsupported properties may be ignored; very large or deeply nested schemas may be rejected. | Refusals and `max_tokens` can produce non-schema output; complex schemas can fail grammar compilation. | JSON mode only guarantees JSON. Custom structured outputs are more reliable, but prompt iteration and local validation are still needed. |

## Practical Portability Rules

1. If the same schema must run across providers, avoid numeric bounds, string length, regex, and array length as model-enforced constraints. Put those constraints in descriptions and validate after parsing.
2. If the schema is OpenAI-only or Gemini-only, numeric ranges and bounded lists can be useful model-side constraints. Keep the local validator anyway.
3. If the schema is Claude-only, expect SDK helpers to simplify unsupported constraints before sending the schema. Use Pydantic/Zod validation after `parse()` for the real guarantee.
4. If the schema is Mistral-only, use custom structured outputs with `type: "json_schema"`, but run a small conformance eval for constraints beyond basic type, required, enum, and object shape.
5. Keep provider test fixtures for every schema that relies on anything beyond the portable baseline.

## Source Notes

Sources for this page live in `sources.md#schema-provider-support`.
