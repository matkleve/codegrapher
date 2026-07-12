#!/usr/bin/env node
/**
 * Guard: trace-syntax.css must not set color on indexed token chips.
 * Ownership: interaction-emphasis.implementation.supplement.md
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = join(root, "client/src/styles/trace-syntax.css");
const text = readFileSync(file, "utf8");
const hits = text
  .split("\n")
  .map((line, i) => ({ line: i + 1, text: line.trim() }))
  .filter((row) => !row.text.startsWith("/*") && !row.text.startsWith("*"))
  .filter(
    (row) =>
      row.text.includes(".token-chip") || row.text.includes(".token-def-label"),
  )
  .filter((row) => /^\s*color\s*:/.test(row.text));

if (hits.length > 0) {
  console.error("trace-syntax.css must not set chip color:\n");
  for (const hit of hits) {
    console.error(`  ${hit.line}: ${hit.text}`);
  }
  process.exit(1);
}

console.log("✓ trace-syntax.css chip color guard");
