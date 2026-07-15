#!/usr/bin/env node
/**
 * Guard: trace CSS + graph chrome hover patterns.
 * Ownership: trace-hover-rollout.md, tailwind-tokens-only.mdc
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function scanTraceSyntaxChipColor() {
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
    .filter((row) => /color\s*:/.test(row.text));

  for (const hit of hits) {
    errors.push(`trace-syntax.css:${hit.line} — chip color forbidden: ${hit.text}`);
  }
}

function scanHoverBgPrimary() {
  const dirs = [
    "client/src/components/graph",
    "client/src/components/nodes",
    "client/src/components/code",
  ];
  for (const dir of dirs) {
    const full = join(root, dir);
    if (!existsSync(full)) continue;
    walkTsx(full, (file, line, text) => {
      if (text.includes("hover:bg-primary")) {
        errors.push(
          `${relative(root, file)}:${line} — use brand/hoverable tokens, not hover:bg-primary`,
        );
      }
    });
  }
}

function walkTsx(dir, onLine) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkTsx(full, onLine);
      continue;
    }
    if (!/\.(tsx|ts|css)$/.test(entry)) continue;
    const lines = readFileSync(full, "utf8").split("\n");
    lines.forEach((text, i) => onLine(full, i + 1, text));
  }
}

scanTraceSyntaxChipColor();
scanHoverBgPrimary();

if (errors.length > 0) {
  console.error("guard-trace-css failed:\n");
  for (const err of errors) console.error(`  ${err}`);
  process.exit(1);
}

console.log("✓ guard-trace-css");
