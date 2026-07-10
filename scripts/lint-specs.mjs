#!/usr/bin/env node

/**
 * Element Spec Lint — validates markdown specs under docs/specs/
 *
 * Usage: node scripts/lint-specs.mjs [--max-lines=N] [--warn-lines=N]
 *
 * Exit codes: 0 pass, 1 errors
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, basename, resolve, relative } from "node:path";

const DEFAULT_MAX_LINES = 180;
const DEFAULT_WARN_LINES = 150;
const DEFAULT_MAX_WHAT_IT_IS = 8;
const DEFAULT_MAX_WHAT_IT_LOOKS_LIKE = 40;

const REQUIRED_SECTIONS = [
  "What It Is",
  "What It Looks Like",
  "Where It Lives",
  "Actions",
  "Component Hierarchy",
  "Acceptance Criteria",
];

const CANONICAL_ORDER = [
  "What It Is",
  "What It Looks Like",
  "Where It Lives",
  "Actions",
  "Component Hierarchy",
  "Data",
  "State",
  "File Map",
  "Wiring",
  "Acceptance Criteria",
];

function parseSections(content) {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const sections = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^## (.+)$/);
    if (match) {
      if (current) {
        current.endLine = i;
        current.lineCount = current.endLine - current.startLine;
      }
      current = {
        name: match[1].trim(),
        startLine: i + 1,
        endLine: null,
        lineCount: 0,
      };
      sections.push(current);
    }
  }
  if (current) {
    current.endLine = lines.length;
    current.lineCount = current.endLine - current.startLine;
  }

  return { lines, sections, totalLines: lines.length };
}

function normalizeSectionName(name) {
  return name
    .replace(/\s*[(&].*$/, "")
    .replace(/\s*\(.*\)$/, "")
    .trim();
}

function findSection(sections, targetName) {
  return sections.find((s) => {
    const normalized = normalizeSectionName(s.name);
    return (
      normalized.toLowerCase() === targetName.toLowerCase() ||
      s.name.toLowerCase() === targetName.toLowerCase() ||
      s.name.toLowerCase().startsWith(targetName.toLowerCase())
    );
  });
}

function ruleMaxLines(parsed, config) {
  const diagnostics = [];
  if (parsed.totalLines > config.maxLines) {
    diagnostics.push({
      severity: "error",
      rule: "spec-max-lines",
      message: `Spec has ${parsed.totalLines} lines (max: ${config.maxLines}). Split into *.supplement.md or *.acceptance-criteria.md.`,
      line: 1,
    });
  } else if (parsed.totalLines > config.warnLines) {
    diagnostics.push({
      severity: "warning",
      rule: "spec-max-lines",
      message: `Spec has ${parsed.totalLines} lines (recommended max: ${config.warnLines}). Consider splitting.`,
      line: 1,
    });
  }
  return diagnostics;
}

function ruleRequiredSections(parsed) {
  const diagnostics = [];
  for (const required of REQUIRED_SECTIONS) {
    if (!findSection(parsed.sections, required)) {
      diagnostics.push({
        severity: "error",
        rule: "spec-required-sections",
        message: `Missing required section: "## ${required}"`,
        line: 1,
      });
    }
  }
  return diagnostics;
}

function ruleSectionOrder(parsed) {
  const diagnostics = [];
  const presentCanonical = CANONICAL_ORDER.filter((name) =>
    findSection(parsed.sections, name),
  );

  let lastIndex = -1;
  for (const name of presentCanonical) {
    const section = findSection(parsed.sections, name);
    const currentIndex = parsed.sections.indexOf(section);
    if (currentIndex < lastIndex) {
      diagnostics.push({
        severity: "warning",
        rule: "spec-section-order",
        message: `Section "## ${section.name}" is out of canonical order`,
        line: section.startLine,
      });
    }
    lastIndex = currentIndex;
  }
  return diagnostics;
}

function ruleWhatItIsLength(parsed, config) {
  const diagnostics = [];
  const section = findSection(parsed.sections, "What It Is");
  if (section && section.lineCount > config.maxWhatItIs) {
    diagnostics.push({
      severity: "warning",
      rule: "what-it-is-length",
      message: `"What It Is" has ${section.lineCount} lines (recommended max: ${config.maxWhatItIs}).`,
      line: section.startLine,
    });
  }
  return diagnostics;
}

function ruleWhatItLooksLikeLength(parsed, config) {
  const diagnostics = [];
  const section = findSection(parsed.sections, "What It Looks Like");
  if (section && section.lineCount > config.maxWhatItLooksLike) {
    diagnostics.push({
      severity: "warning",
      rule: "what-it-looks-like-length",
      message: `"What It Looks Like" has ${section.lineCount} lines (recommended max: ${config.maxWhatItLooksLike}).`,
      line: section.startLine,
    });
  }
  return diagnostics;
}

function ruleAcceptanceCriteria(parsed) {
  const diagnostics = [];
  const section = findSection(parsed.sections, "Acceptance Criteria");
  if (section) {
    const sectionContent = parsed.lines
      .slice(section.startLine, section.endLine)
      .join("\n");
    const checkboxCount = (sectionContent.match(/- \[[ x]\]/g) || []).length;
    if (checkboxCount === 0) {
      diagnostics.push({
        severity: "error",
        rule: "has-acceptance-criteria",
        message: "Acceptance Criteria section has no checkbox items (- [ ] ...)",
        line: section.startLine,
      });
    }
  }
  return diagnostics;
}

function lintSpec(filePath, config) {
  const content = readFileSync(filePath, "utf-8");
  const parsed = parseSections(content);

  const diagnostics = [
    ...ruleMaxLines(parsed, config),
    ...ruleRequiredSections(parsed),
    ...ruleSectionOrder(parsed),
    ...ruleWhatItIsLength(parsed, config),
    ...ruleWhatItLooksLikeLength(parsed, config),
    ...ruleAcceptanceCriteria(parsed),
  ];

  return { file: basename(filePath), filePath, totalLines: parsed.totalLines, diagnostics };
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const config = {
    maxLines: DEFAULT_MAX_LINES,
    warnLines: DEFAULT_WARN_LINES,
    maxWhatItIs: DEFAULT_MAX_WHAT_IT_IS,
    maxWhatItLooksLike: DEFAULT_MAX_WHAT_IT_LOOKS_LIKE,
    specDir: null,
  };

  for (const arg of args) {
    if (arg.startsWith("--max-lines=")) {
      config.maxLines = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--warn-lines=")) {
      config.warnLines = parseInt(arg.split("=")[1], 10);
    } else if (!arg.startsWith("--")) {
      config.specDir = arg;
    }
  }

  return config;
}

function isSplitChildSpec(filePath) {
  const base = basename(filePath).toLowerCase();
  if (base.endsWith(".supplement.md") || base.endsWith(".acceptance-criteria.md")) {
    return true;
  }
  const stem = base.slice(0, -".md".length);
  const dotIndex = stem.indexOf(".");
  return dotIndex > 0 && stem.length > dotIndex + 1;
}

function shouldIncludeSpecFile(filePath, specRootDir) {
  const lowerName = basename(filePath).toLowerCase();
  if (!lowerName.endsWith(".md")) return false;
  if (lowerName === "readme.md" || lowerName.endsWith(".bak")) return false;
  if (lowerName.startsWith("governance-")) return false;
  if (lowerName.startsWith("spec-")) return false;

  if (specRootDir) {
    const rel = relative(specRootDir, filePath).replace(/\\/g, "/").toLowerCase();
    if (rel === "spec-size-backlog.md") return false;
    if (isSplitChildSpec(filePath)) return false;
  }

  return true;
}

function collectSpecFiles(specDir) {
  const files = [];
  const stack = [specDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    const entries = readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && shouldIncludeSpecFile(fullPath, specDir)) {
        files.push(fullPath);
      }
    }
  }

  return files.sort();
}

function main() {
  const config = parseArgs(process.argv);
  const scriptDir = new URL(".", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
  const projectRoot = resolve(scriptDir, "..");
  const specDir = config.specDir || join(projectRoot, "docs", "specs");

  let files;
  try {
    files = collectSpecFiles(specDir);
  } catch (err) {
    console.error(`Error reading spec directory: ${specDir}`);
    console.error(err.message);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log("No spec files found.");
    process.exit(0);
  }

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const file of files) {
    const result = lintSpec(file, config);
    const rel = relative(projectRoot, result.filePath);
    const errors = result.diagnostics.filter((d) => d.severity === "error");
    const warnings = result.diagnostics.filter((d) => d.severity === "warning");
    totalErrors += errors.length;
    totalWarnings += warnings.length;

    if (errors.length === 0 && warnings.length === 0) {
      console.log(`✓ ${rel} (${result.totalLines} lines)`);
      continue;
    }

    console.log(`\n${rel} (${result.totalLines} lines)`);
    for (const d of errors) {
      console.log(`  ERROR [${d.rule}]${d.line ? `:${d.line}` : ""} ${d.message}`);
    }
    for (const d of warnings) {
      console.log(`  WARN  [${d.rule}]${d.line ? `:${d.line}` : ""} ${d.message}`);
    }
  }

  console.log(`\n${files.length} specs — ${totalErrors} error(s), ${totalWarnings} warning(s)`);
  process.exit(totalErrors > 0 ? 1 : 0);
}

main();
