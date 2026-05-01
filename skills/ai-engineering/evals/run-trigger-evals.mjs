#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const evalPath = new URL("./trigger-queries.json", import.meta.url);
const cases = JSON.parse(fs.readFileSync(evalPath, "utf8"));

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
      "provider-side caching",
      "same long",
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
      "categories",
      "tool results",
      "choose the next tool",
      "bounded agent",
      "classification",
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
      "retrieved evidence",
    ])
  ) {
    subskills.add("subskills/retrieval.md");
  }

  if (includesAny(q, ["pdf", "cited", "citation", "provenance"])) {
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
    subskills.add("subskills/llm-calls.md");
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

function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((value, index) => value === right[index]);
}

const results = cases.map((testCase) => {
  const actual = classify(testCase.query);
  const triggerPass = actual.should_trigger === testCase.should_trigger;
  const subskillsPass = sameSet(actual.subskills, testCase.expected_subskills);
  return {
    id: testCase.id,
    pass: triggerPass && subskillsPass,
    expected_trigger: testCase.should_trigger,
    actual_trigger: actual.should_trigger,
    expected_subskills: testCase.expected_subskills,
    actual_subskills: actual.subskills,
  };
});

const failed = results.filter((result) => !result.pass);

for (const result of results) {
  const mark = result.pass ? "PASS" : "FAIL";
  console.log(`${mark} ${result.id}`);
  if (!result.pass) {
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
