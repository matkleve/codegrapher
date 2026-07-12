#!/usr/bin/env node

/**
 * CSS file length lint — mirrors eslint.shared.mjs max-lines (200) for stylesheets.
 * Counts non-blank, non-comment lines only.
 *
 * Usage: node scripts/lint-file-length.mjs [--max-lines=N]
 * Exit codes: 0 pass, 1 errors
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const scriptDir = new URL(".", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const projectRoot = resolve(scriptDir, "..");
const stylesDir = join(projectRoot, "client", "src", "styles");
const indexCss = join(projectRoot, "client", "src", "index.css");

const DEFAULT_MAX_LINES = 200;

function parseMaxLines(argv) {
  const arg = argv.find((a) => a.startsWith("--max-lines="));
  return arg ? Number(arg.split("=")[1]) : DEFAULT_MAX_LINES;
}

function countCssLines(content) {
  let count = 0;
  let inBlockComment = false;

  for (const rawLine of content.split("\n")) {
    let line = rawLine.trim();
    if (!line) continue;

    while (inBlockComment) {
      const end = line.indexOf("*/");
      if (end === -1) break;
      line = line.slice(end + 2).trim();
      inBlockComment = false;
      if (!line) continue;
    }

    if (line.startsWith("/*")) {
      if (!line.includes("*/")) {
        inBlockComment = true;
        continue;
      }
      line = line.replace(/\/\*[\s\S]*?\*\//g, "").trim();
      if (!line) continue;
    }

    if (line.startsWith("//")) continue;
    count++;
  }

  return count;
}

function collectCssFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      collectCssFiles(path, acc);
    } else if (name.endsWith(".css")) {
      acc.push(path);
    }
  }
  return acc;
}

function lintCssFile(filePath, maxLines) {
  const content = readFileSync(filePath, "utf8");
  const lines = countCssLines(content);
  if (lines <= maxLines) return null;

  return {
    rule: "css-max-lines",
    severity: "error",
    message: `${lines} code lines (max: ${maxLines}). Split into a domain file under styles/.`,
    lines,
  };
}

function main() {
  const maxLines = parseMaxLines(process.argv.slice(2));
  const files = [indexCss, ...collectCssFiles(stylesDir)].sort();
  let totalErrors = 0;

  for (const file of files) {
    const diagnostic = lintCssFile(file, maxLines);
    if (!diagnostic) continue;

    const rel = relative(projectRoot, file);
    console.log(`\n${rel}`);
    console.log(`  ERROR [${diagnostic.rule}]: ${diagnostic.message}`);
    totalErrors++;
  }

  console.log(`\n${files.length} CSS files — ${totalErrors} error(s)`);
  process.exit(totalErrors > 0 ? 1 : 0);
}

main();
