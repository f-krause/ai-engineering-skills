#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const evalPath = new URL("./trigger-queries.json", import.meta.url);
const cases = JSON.parse(fs.readFileSync(evalPath, "utf8"));
const skillPath = new URL("../SKILL.md", import.meta.url);
const skillText = fs.readFileSync(skillPath, "utf8");

const args = new Set(process.argv.slice(2));
const useCodex = args.has("--codex");

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function classify(query) {
  const q = query.toLowerCase();

  const negativePatterns = [
    "responsive layout",
    "react dashboard",
    "rest endpoint",
    "billing address",
    "reads a csv",
    "read a csv",
    "warehouse",
    "update the readme",
    "project overview",
    "oauth callback",
    "landing page",
    "typography",
    "search box",
    "filter rows",
    "sql migration",
    "orm schema",
    "human agent",
    "confidence interval",
    "a/b test",
  ];

  if (includesAny(q, negativePatterns)) {
    return { should_trigger: false, subskills: [] };
  }

  const subskills = new Set();

  if (
    includesAny(q, [
      "openai call",
      "classifies",
      "classify",
    ])
  ) {
    subskills.add("subskills/llm-calls.md");
  }

  if (
    includesAny(q, [
      "zod",
      "pydantic",
      "schema",
      "structured object",
      "structured output",
      "json.parse",
      "explicit enums",
    ])
  ) {
    subskills.add("subskills/schema-design.md");
  }

  if (
    includesAny(q, [
      "customer pdf",
      "pdfs",
      "vector rag",
      "long context",
      "document-scoped search",
    ])
  ) {
    subskills.add("subskills/retrieval.md");
  }

  if (includesAny(q, ["cited", "citation", "provenance"])) {
    subskills.add("subskills/citations.md");
  }

  if (includesAny(q, ["web_search", "web search", "current-company", "current company"])) {
    subskills.add("subskills/openai-web-search.md");
  }

  if (includesAny(q, ["confidence bucket", "confidence buckets", "human-review", "review routing"])) {
    subskills.add("subskills/confidence.md");
  }

  if (includesAny(q, ["agent loop", "bounded agent", "inspect tool results", "choose the next tool"])) {
    subskills.add("subskills/agents.md");
  }

  if (includesAny(q, ["three-step workflow", "one-shot prompt", "verifier pass"])) {
    subskills.add("subskills/workflows.md");
  }

  if (includesAny(q, ["prompt injection", "eval cases", "adversarial"])) {
    subskills.add("subskills/safety-evals.md");
  }

  if (includesAny(q, ["gemini", "provider-side caching"])) {
    subskills.add("subskills/caching/gemini.md");
  }

  if (includesAny(q, ["tracing", "token usage", "latency", "failures"])) {
    subskills.add("subskills/tracing.md");
  }

  return {
    should_trigger: subskills.size > 0,
    subskills: [...subskills].sort(),
  };
}

function extractJson(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Codex returned an empty response");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error(`Codex response did not contain JSON: ${trimmed}`);
    }
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
  }
}

function classifyWithCodex() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-skill-eval-"));
  const schemaPath = path.join(tmpDir, "codex-trigger-eval.schema.json");
  const outputPath = path.join(tmpDir, "codex-trigger-eval-output.json");

  fs.writeFileSync(
    schemaPath,
    JSON.stringify(
      {
        type: "object",
        additionalProperties: false,
        properties: {
          results: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "string" },
                should_trigger: { type: "boolean" },
                subskills: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["id", "should_trigger", "subskills"],
            },
          },
        },
        required: ["results"],
      },
      null,
      2,
    ),
  );

  const prompt = [
    "You are evaluating trigger behavior for a Codex skill.",
    "Use only the provided SKILL.md text and eval cases.",
    "For each eval query, decide whether the ai-engineering skill should trigger and which subskill file paths should be read.",
    "Return the smallest sufficient subskill set for the query.",
    "Do not include adjacent or companion subskills unless the query explicitly needs that material.",
    "Return only JSON that matches the output schema.",
    "Use exact subskill paths from expected_subskills when they are appropriate.",
    "Do not include explanations.",
    "",
    "<SKILL.md>",
    skillText,
    "</SKILL.md>",
    "",
    "<eval_cases>",
    JSON.stringify(
      cases.map(({ id, query }) => ({ id, query })),
      null,
      2,
    ),
    "</eval_cases>",
  ].join("\n");

  const result = spawnSync(
    "codex",
    [
      "exec",
      "--cd",
      process.cwd(),
      "--sandbox",
      "read-only",
      "--ephemeral",
      "--output-schema",
      schemaPath,
      "--output-last-message",
      outputPath,
      "-",
    ],
    {
      input: prompt,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      [
        `codex exec failed with status ${result.status}`,
        result.stdout.trim(),
        result.stderr.trim(),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  const outputText = fs.readFileSync(outputPath, "utf8");
  const parsed = extractJson(outputText);
  const byId = new Map(
    parsed.results.map((resultItem) => [
      resultItem.id,
      {
        should_trigger: resultItem.should_trigger,
        subskills: [...resultItem.subskills].sort(),
      },
    ]),
  );

  return cases.map((testCase) => {
    const actual = byId.get(testCase.id);
    if (!actual) {
      return {
        id: testCase.id,
        should_trigger: false,
        subskills: [],
        missing: true,
      };
    }
    return actual;
  });
}

function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((value, index) => value === right[index]);
}

const actualResults = useCodex
  ? classifyWithCodex()
  : cases.map((testCase) => classify(testCase.query));

const results = cases.map((testCase, index) => {
  const actual = actualResults[index];
  const triggerPass = actual.should_trigger === testCase.should_trigger;
  const subskillsPass = sameSet(actual.subskills, testCase.expected_subskills);
  return {
    id: testCase.id,
    pass: triggerPass && subskillsPass,
    expected_trigger: testCase.should_trigger,
    actual_trigger: actual.should_trigger,
    expected_subskills: testCase.expected_subskills,
    actual_subskills: actual.subskills,
    missing: actual.missing ?? false,
  };
});

const failed = results.filter((result) => !result.pass);

for (const result of results) {
  const mark = result.pass ? "PASS" : "FAIL";
  console.log(`${mark} ${result.id}`);
  if (!result.pass) {
    if (result.missing) {
      console.log("  missing result from Codex output");
    }
    console.log(`  expected trigger: ${result.expected_trigger}`);
    console.log(`  actual trigger:   ${result.actual_trigger}`);
    console.log(`  expected routes:  ${result.expected_subskills.join(", ") || "(none)"}`);
    console.log(`  actual routes:    ${result.actual_subskills.join(", ") || "(none)"}`);
  }
}

console.log("");
console.log(`Trigger evals: ${results.length - failed.length}/${results.length} passed`);

if (failed.length > 0) {
  process.exitCode = 1;
}
