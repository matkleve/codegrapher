#!/usr/bin/env node
/**
 * Fail if trace specs contain stale timing literals superseded by traceMotion.ts.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const motionFile = join(root, "client/src/lib/traceMotion.ts");
const motionText = readFileSync(motionFile, "utf8");

const dwellMatch = motionText.match(/dwellColdMs:\s*(\d+)/);
const dwellCold = dwellMatch ? dwellMatch[1] : "?";

const specFiles = [
  "docs/specs/system/token-hover.atlas.supplement.md",
  "docs/specs/system/preview-edges.interactions.supplement.md",
  "docs/specs/system/preview-edges.md",
  "docs/specs/system/interaction-emphasis.md",
  "docs/specs/system/interaction-emphasis.acceptance-criteria.md",
];

const banned = [
  { pattern: /FIRE_COLD_MS\s*\|\s*40/, msg: "Use TRACE_MOTION.dwellColdMs / traceMotion.ts instead of FIRE_COLD_MS | 40" },
  { pattern: /~\s*240ms|240ms draw|reveal 240ms/i, msg: "Use wireRevealMs from traceMotion.ts (not 240ms)" },
  { pattern: /WAAPI/i, msg: "Wire draw is RAF in wireReveal.ts (not WAAPI)" },
  { pattern: /\+100ms\/hop|100ms per hop|\+100ms per hop/i, msg: "Use wireHopStaggerMs from traceMotion.ts" },
  { pattern: /LEAVE_GRACE_MS\s*\|\s*50/, msg: "Leave grace is 0; use wirePropagationDrainMs" },
];

const errors = [];
for (const rel of specFiles) {
  const text = readFileSync(join(root, rel), "utf8");
  for (const { pattern, msg } of banned) {
    if (pattern.test(text)) {
      errors.push(`${rel}: ${msg}`);
    }
  }
  if (/\b40ms\b/.test(text) && !text.includes("dwellColdMs") && rel.includes("acceptance-criteria")) {
    if (/after 40ms|0–40ms|dwell 40/.test(text)) {
      errors.push(`${rel}: replace hardcoded 40ms with dwellColdMs (${dwellCold}ms)`);
    }
  }
}

if (errors.length > 0) {
  console.error("lint-trace-motion-sync failed:\n");
  for (const err of errors) console.error(`  ${err}`);
  process.exit(1);
}

console.log(`✓ trace motion spec sync (dwellColdMs=${dwellCold})`);
