#!/usr/bin/env node
/**
 * Browser trace-hover profiler (requires dev server on :5173).
 * Run: node scripts/trace-hover-perf.mjs
 */
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO = path.resolve(__dirname, "../fixtures/demo");
const URL = "http://localhost:5173/";

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    console.error("Playwright chromium not available:", err.message);
    console.error("Install: npx playwright install chromium");
    process.exit(1);
  }

  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });

  // Open fixtures folder
  await page.fill("input", DEMO);
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await page.waitForTimeout(500);

  // Click OrderService to load graph
  await page.locator(".file-tree-leaf", { hasText: "OrderService.ts" }).click();
  await page.waitForTimeout(800);

  const metrics = await page.evaluate(async () => {
    const pane = document.querySelector(".graph-pane");
    if (!pane) return { error: "no graph pane" };

    const chip = pane.querySelector(
      ".token-chip.cursor-pointer, .token-def-label.cursor-pointer",
    );
    if (!chip) return { error: "no token chip on canvas" };

    const rect = chip.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const samples = [];

    for (let run = 0; run < 5; run++) {
      // leave
      pane.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 200));

      const t0 = performance.now();
      chip.dispatchEvent(
        new MouseEvent("mouseenter", { bubbles: true, clientX: x, clientY: y }),
      );

      // wait for trace-active (committed trace)
      const deadline = t0 + 500;
      while (performance.now() < deadline) {
        if (document.querySelector(".graph-pane.graph-trace-active")) break;
        await new Promise((r) => requestAnimationFrame(r));
      }
      const traceAt = performance.now();

      // wait for wires
      while (performance.now() < deadline) {
        const wires = document.querySelectorAll(".preview-edge-path");
        if (wires.length > 0) break;
        await new Promise((r) => requestAnimationFrame(r));
      }
      const wiresAt = performance.now();

      chip.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));

      samples.push({
        traceMs: traceAt - t0,
        wiresMs: wiresAt - t0,
        wireCount: document.querySelectorAll(".preview-edge-path").length,
      });
      await new Promise((r) => setTimeout(r, 250));
    }

    const med = (arr) => {
      const s = [...arr].sort((a, b) => a - b);
      return s[Math.floor(s.length / 2)];
    };

    return {
      chip: chip.textContent?.trim().slice(0, 30),
      medianTraceMs: med(samples.map((s) => s.traceMs)),
      medianWiresMs: med(samples.map((s) => s.wiresMs)),
      wireCount: samples[0]?.wireCount ?? 0,
      samples,
      longTasks: performance.getEntriesByType("longtask").map((e) => ({
        duration: e.duration,
        start: e.startTime,
      })),
      rafBudget: (() => {
        let frames = 0;
        const start = performance.now();
        return new Promise((resolve) => {
          function frame() {
            frames++;
            if (performance.now() - start < 1000) requestAnimationFrame(frame);
            else resolve(frames);
          }
          requestAnimationFrame(frame);
        });
      })(),
    };
  });

  if (metrics.error) {
    console.error("Browser perf failed:", metrics.error);
    await browser.close();
    process.exit(1);
  }

  metrics.rafBudget = await metrics.rafBudget;

  console.log("\n=== Browser trace-hover perf ===");
  console.log(`Chip: ${metrics.chip}`);
  console.log(`Wires on trace: ${metrics.wireCount}`);
  console.log(`Median enter → graph-trace-active: ${metrics.medianTraceMs.toFixed(1)}ms`);
  console.log(`Median enter → wires in DOM: ${metrics.medianWiresMs.toFixed(1)}ms`);
  console.log(`Idle RAF rate (~1s): ${metrics.rafBudget} frames`);
  if (metrics.longTasks.length) {
    console.log(`Long tasks (>50ms): ${metrics.longTasks.length}`);
    for (const t of metrics.longTasks.slice(0, 5)) {
      console.log(`  ${t.duration.toFixed(1)}ms at ${t.startTime.toFixed(0)}ms`);
    }
  } else {
    console.log("Long tasks during session: none recorded");
  }
  console.log("\nPer-run samples (enter ms):");
  for (const s of metrics.samples) {
    console.log(
      `  trace=${s.traceMs.toFixed(1)}ms wires=${s.wiresMs.toFixed(1)}ms (${s.wireCount} wires)`,
    );
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
