#!/usr/bin/env node
/**
 * Stress script for load-target resolution against fixture APIs.
 * Run: node scripts/stress-load-flow.mjs
 * Requires server on :3001 (npm run dev).
 */
import { execSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const ORDER = `${ROOT}/fixtures/demo/OrderService.ts`;
const PAYMENT = `${ROOT}/fixtures/demo/PaymentGateway.ts`;
const BASE = "http://localhost:3001";

function get(path) {
  return JSON.parse(execSync(`curl -sf ${JSON.stringify(`${BASE}${path}`)}`, { encoding: "utf8" }));
}

const failures = [];

function assert(name, ok, detail = "") {
  if (!ok) failures.push({ name, detail });
  console.log(ok ? `  ✓ ${name}` : `  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

console.log("Load flow API stress\n");

let orderGraph;
try {
  orderGraph = get(`/api/file-graph?path=${encodeURIComponent(ORDER)}`);
} catch {
  console.error("Server not reachable on :3001 — start with: npm run dev");
  process.exit(1);
}

assert("OrderService file-graph has checkout method", orderGraph.nodes.some((n) => n.label === "checkout"));

const checkoutNode = orderGraph.nodes.find((n) => n.label === "checkout");
assert(
  "checkout method references charge in source",
  checkoutNode?.code?.includes("charge") ?? false,
);

let merged;
try {
  const focus = get(`/api/focus?path=${encodeURIComponent(PAYMENT)}&depth=1`);
  const nodeIds = new Set(orderGraph.nodes.map((n) => n.id));
  for (const n of focus.nodes) nodeIds.add(n.id);
  merged = { nodes: [...nodeIds].map((id) => orderGraph.nodes.find((n) => n.id === id) ?? focus.nodes.find((n) => n.id === id)).filter(Boolean) };
} catch (e) {
  assert("focus merge PaymentGateway", false, String(e));
}

assert(
  "merged graph contains PaymentGateway class",
  merged?.nodes.some((n) => n.label === "PaymentGateway"),
);

let index;
try {
  index = get(`/api/index?path=${encodeURIComponent(`${ROOT}/fixtures/demo`)}`);
} catch (e) {
  assert("project index", false, String(e));
}

const chargeEntries = index?.symbols?.charge ?? [];
assert("index has charge symbol", chargeEntries.length >= 1, `count=${chargeEntries.length}`);
assert(
  "index charge includes PaymentGateway file",
  chargeEntries.some((e) => e.filePath.includes("PaymentGateway")),
);

const iterations = 50;
const start = performance.now();
for (let i = 0; i < iterations; i++) {
  get(`/api/focus?path=${encodeURIComponent(PAYMENT)}&depth=1`);
}
const elapsed = performance.now() - start;
assert(`${iterations} sequential focus calls`, elapsed < 20_000, `${elapsed.toFixed(0)}ms`);

const focusOrder = get(`/api/focus?path=${encodeURIComponent(ORDER)}&depth=1`);
assert(
  "focus OrderService depth=1 pulls PaymentGateway",
  focusOrder.nodes.some((n) => n.label === "PaymentGateway"),
);

try {
  execSync(
    `curl -sf -o /dev/null -w "%{http_code}" ${JSON.stringify(`${BASE}/api/file-graph?path=${encodeURIComponent("/no/such/file.ts")}`)}`,
    { encoding: "utf8" },
  );
  assert("missing file returns error", false, "expected non-zero exit");
} catch {
  assert("missing file returns error", true);
}

const symbolHits = get(`/api/index?path=${encodeURIComponent(`${ROOT}/fixtures/demo`)}`);
const allSymbols = Object.keys(symbolHits.symbols ?? {});
assert("demo index has multiple symbols", allSymbols.length >= 5, `count=${allSymbols.length}`);

console.log(`\n${failures.length === 0 ? "All checks passed" : `${failures.length} failed`}`);
if (failures.length > 0) {
  console.error(failures);
  process.exit(1);
}
