#!/usr/bin/env node

/**
 * Enforces Feldpost-style file length caps on TypeScript source.
 * Warn above FILE_MAX_WARN; exit 1 above FILE_MAX_ERROR.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { FILE_MAX_ERROR, FILE_MAX_WARN } from "../eslint.shared.mjs";

const ROOT = join(fileURLToPath(new URL("..", import.meta.url)));
const SOURCE_ROOTS = [
  join(ROOT, "client", "src"),
  join(ROOT, "server", "src"),
];
const EXT = new Set([".ts", ".tsx"]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "dist") continue;
      walk(path, out);
      continue;
    }
    if (EXT.has(path.slice(path.lastIndexOf(".")))) out.push(path);
  }
  return out;
}

function lineCount(filePath) {
  return readFileSync(filePath, "utf8").replace(/\r\n/g, "\n").split("\n").length;
}

const warnings = [];
const errors = [];

for (const root of SOURCE_ROOTS) {
  for (const filePath of walk(root)) {
    const lines = lineCount(filePath);
    const rel = relative(ROOT, filePath);
    if (lines > FILE_MAX_ERROR) {
      errors.push({ rel, lines });
    } else if (lines > FILE_MAX_WARN) {
      warnings.push({ rel, lines });
    }
  }
}

for (const { rel, lines } of warnings) {
  console.warn(
    `⚠ ${rel}: ${lines} lines (recommended max: ${FILE_MAX_WARN}). Consider splitting.`,
  );
}

for (const { rel, lines } of errors) {
  console.error(
    `✖ ${rel}: ${lines} lines (max: ${FILE_MAX_ERROR}). Split this file.`,
  );
}

const checked = warnings.length + errors.length;
if (errors.length > 0) {
  console.error(
    `\n${errors.length} file(s) over ${FILE_MAX_ERROR} lines (${warnings.length} warning(s)).`,
  );
  process.exit(1);
}

if (warnings.length > 0) {
  console.log(`\n${warnings.length} file(s) over ${FILE_MAX_WARN} lines (warn only).`);
}

process.exit(0);
