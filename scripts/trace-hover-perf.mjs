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
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });

  await page.fill("input", DEMO);
  await page.getByRole("button", { name: "Load folder" }).click();
  await page.waitForSelector("text=OrderService.ts", { timeout: 60_000 });
  await page.getByText("OrderService.ts", { exact: true }).first().click();
  await page.waitForSelector(".member-sig-token-chip", { timeout: 30_000 });
  await page.waitForTimeout(500);

  const chip = page.locator(".member-sig-token-chip").first();
  const box = await chip.boundingBox();
  if (!box) throw new Error("no sig param chip box");

  const samples = [];

  for (let run = 0; run < 5; run++) {
    await page.mouse.move(10, 10);
    await page.waitForTimeout(200);

    const t0 = Date.now();

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

    const pendingAt = await page
      .waitForFunction(
        () => {
          const el = document.querySelector(".member-sig-token-chip.token-chip-pending-trace");
          return el != null;
        },
        { timeout: 200 },
      )
      .then(() => Date.now())
      .catch(() => null);

    const traceAt = await page
      .waitForSelector(".graph-pane.graph-trace-active", { timeout: 500 })
      .then(() => Date.now())
      .catch(() => null);

    const wiresAt = await page
      .waitForSelector(".preview-edge-path", { timeout: 500 })
      .then(() => Date.now())
      .catch(() => null);

    const wireCount = await page.locator(".preview-edge-path").count();
    const token = await chip.innerText();

    await page.mouse.move(10, 10);
    await page.waitForTimeout(200);

    samples.push({
      pendingMs: pendingAt != null ? pendingAt - t0 : null,
      traceMs: traceAt != null ? traceAt - t0 : null,
      wiresMs: wiresAt != null ? wiresAt - t0 : null,
      wireCount,
      token: token.trim(),
    });
  }

  const med = (key) => {
    const arr = samples.map((s) => s[key]).filter((v) => v != null);
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };

  const rafPerSec = await page.evaluate(async () => {
    let frames = 0;
    const start = performance.now();
    await new Promise((resolve) => {
      function frame() {
        frames++;
        if (performance.now() - start < 1000) requestAnimationFrame(frame);
        else resolve(undefined);
      }
      requestAnimationFrame(frame);
    });
    return frames;
  });

  console.log("\n=== Browser trace-hover perf (real pointer) ===");
  console.log(`Token: ${samples[0]?.token}`);
  console.log(`Median pending chip: ${med("pendingMs")?.toFixed(1) ?? "n/a"}ms`);
  console.log(`Median → graph-trace-active: ${med("traceMs")?.toFixed(1) ?? "TIMEOUT"}ms`);
  console.log(`Median → wires visible: ${med("wiresMs")?.toFixed(1) ?? "TIMEOUT"}ms`);
  console.log(`Wires on last trace: ${samples.at(-1)?.wireCount}`);
  console.log(`Idle RAF (~1s): ${rafPerSec} frames`);
  console.log("\nPer-run (ms from mouseenter):");
  for (const s of samples) {
    console.log(
      `  pending=${s.pendingMs ?? "—"} trace=${s.traceMs ?? "—"} wires=${s.wiresMs ?? "—"} (${s.wireCount} wires)`,
    );
  }

  const jsBench = `see: npm test -- src/lib/traceHoverPerf.test.ts`;
  console.log(`\nJS-only bench: ${jsBench}`);
  console.log(
    "Note: FIRE_COLD_MS=80 + motion-dim=80ms → ~160ms minimum by design even if CPU is fast.",
  );

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
