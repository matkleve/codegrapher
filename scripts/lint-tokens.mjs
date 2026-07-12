#!/usr/bin/env node

/**
 * Size token lint — enforces the canonical typography / control scale from
 * client/src/index.css (:root). Catches arbitrary px/rem in components and
 * duplicate drift outside the token emission block.
 *
 * Usage: node scripts/lint-tokens.mjs
 * Exit codes: 0 pass, 1 errors
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const scriptDir = new URL(".", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const projectRoot = resolve(scriptDir, "..");
const clientSrc = join(projectRoot, "client", "src");

/** Shadcn primitives — upstream; warn only. */
const UI_PRIMITIVE_PREFIX = join(clientSrc, "components", "ui") + "/";

const SIZE_TOKEN_NAMES = [
  "font-size-2xs",
  "font-size-caption",
  "font-size-xs",
  "font-size-sm",
  "font-size-md",
  "icon-size-xs",
  "icon-size-sm",
  "icon-size-md",
  "control-height-compact",
  "control-height-sm",
  "control-height-md",
  "control-height-lg",
  "control-padding-x-compact",
  "control-padding-x-sm",
  "control-padding-x-md",
  "control-gap",
  "token-chip-pad-y",
  "token-chip-pad-x",
  "token-def-label-pad-y",
  "token-def-label-pad-x",
  "token-chip-radius",
  "connector-chip-load-pad-y",
  "connector-chip-load-pad-x",
  "connector-chip-load-font-size",
  "token-def-label-radius",
  "radius-node",
];

const ALLOWED_TEXT_CLASSES = new Set([
  "text-2xs",
  "text-caption",
  "text-xs",
  "text-sm",
  "text-base",
]);

const CONTROL_HEIGHT_ALIASES = {
  "h-7": "--control-height-sm",
  "h-8": "--control-height-md",
  "h-9": "--control-height-lg",
  "min-h-7": "--control-height-sm",
  "min-h-8": "--control-height-md",
};

function collectFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      if (name === "dist" || name === "node_modules") continue;
      collectFiles(path, acc);
    } else if (/\.(tsx|ts|css)$/.test(name)) {
      acc.push(path);
    }
  }
  return acc;
}

function lineNumber(content, index) {
  return content.slice(0, index).split("\n").length;
}

function isUiPrimitive(filePath) {
  return filePath.startsWith(UI_PRIMITIVE_PREFIX);
}

function isTokenEmissionLine(line) {
  return SIZE_TOKEN_NAMES.some((name) => line.includes(`--${name}:`));
}

function lintTsx(filePath, content) {
  const diagnostics = [];
  const ui = isUiPrimitive(filePath);

  const arbitraryText = /\btext-\[(\d+(?:\.\d+)?)(px|rem)\]/g;
  for (const match of content.matchAll(arbitraryText)) {
    const idx = match.index ?? 0;
    diagnostics.push({
      rule: "arbitrary-font-size",
      line: lineNumber(content, idx),
      severity: ui ? "warning" : "error",
      message: `Use a size token (text-2xs, text-caption, text-xs, text-sm, text-base, or text-[length:var(--font-size-*)]) instead of text-[${match[1]}${match[2]}]`,
    });
  }

  const arbitraryLength = /\btext-\[length:(?!var\(--font-size-)/g;
  for (const match of content.matchAll(arbitraryLength)) {
    const idx = match.index ?? 0;
    diagnostics.push({
      rule: "arbitrary-font-size",
      line: lineNumber(content, idx),
      severity: ui ? "warning" : "error",
      message:
        "text-[length:…] must reference --font-size-* (e.g. text-[length:var(--font-size-xs)])",
    });
  }

  for (const [alias, token] of Object.entries(CONTROL_HEIGHT_ALIASES)) {
    const re = new RegExp(`\\b${alias.replace("-", "\\-")}\\b`, "g");
    for (const match of content.matchAll(re)) {
      const idx = match.index ?? 0;
      diagnostics.push({
        rule: "raw-control-height",
        line: lineNumber(content, idx),
        severity: ui ? "warning" : "error",
        message: `Use h-[var(${token})] instead of ${alias}`,
      });
    }
  }

  return diagnostics;
}

function lintCss(filePath, content) {
  const diagnostics = [];
  const isThemeEmission =
    filePath.endsWith("index.css") ||
    filePath.endsWith("theme-light.css") ||
    filePath.endsWith("theme-dark.css");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    if (isTokenEmissionLine(line)) continue;

    const fontSizeMatch = line.match(/font-size:\s*([^;]+);/);
    if (fontSizeMatch) {
      const value = fontSizeMatch[1].trim();
      if (value === "inherit" || value === "unset" || value === "initial") continue;
      if (
        value.startsWith("var(--font-size-") ||
        value.startsWith("var(--connector-chip-load-font-size)") ||
        value.startsWith("var(--control-row-font-size)")
      ) {
        continue;
      }
      diagnostics.push({
        rule: "raw-font-size",
        line: lineNo,
        severity: "error",
        message: `font-size must use --font-size-* token, not \`${value}\``,
      });
    }

    if (!isThemeEmission) {
      const heightMatch = line.match(/(?:^|\s)height:\s*([^;]+);/);
      if (heightMatch) {
        const value = heightMatch[1].trim();
        if (
          /^\d+(?:\.\d+)?(?:px|rem)$/.test(value) &&
          !value.startsWith("var(--control-height-") &&
          !value.startsWith("var(--icon-size-")
        ) {
          diagnostics.push({
            rule: "raw-control-height",
            line: lineNo,
            severity: "warning",
            message: `Prefer height: var(--control-height-*) over \`${value}\``,
          });
        }
      }
    }
  }

  return diagnostics;
}

function lintFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  if (filePath.endsWith(".css")) {
    return lintCss(filePath, content);
  }
  if (filePath.endsWith(".tsx") || filePath.endsWith(".ts")) {
    return lintTsx(filePath, content);
  }
  return [];
}

function main() {
  const files = collectFiles(clientSrc);
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const file of files.sort()) {
    const diagnostics = lintFile(file);
    if (diagnostics.length === 0) continue;

    const rel = relative(projectRoot, file);
    console.log(`\n${rel}`);
    for (const d of diagnostics) {
      const tag = d.severity === "error" ? "ERROR" : "WARN ";
      console.log(`  ${tag} [${d.rule}]:${d.line} ${d.message}`);
      if (d.severity === "error") totalErrors++;
      else totalWarnings++;
    }
  }

  console.log(
    `\n${files.length} files — ${totalErrors} error(s), ${totalWarnings} warning(s)`,
  );
  process.exit(totalErrors > 0 ? 1 : 0);
}

main();
