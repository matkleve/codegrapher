import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const FIXTURES = path.join(ROOT, "fixtures/demo");
const OUT = path.join(ROOT, ".debug/wire-screenshots");

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });

  const folderInput = page.locator("input").first();
  await folderInput.fill(FIXTURES);
  await page.getByRole("button", { name: "Open" }).click();
  await page.waitForTimeout(800);

  await page.getByText("OrderService.ts", { exact: true }).click();
  await page.waitForTimeout(1200);

  const methodRow = page.locator(".member-row-label", { hasText: "describeStatus" }).first();
  await methodRow.click();
  await page.waitForTimeout(600);

  const statusChip = page.locator('.token-chip[data-symbol-name="status"]').first();
  await statusChip.hover();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "hover-status.png") });

  const wireInfo = await page.evaluate(() => {
    const paths = [...document.querySelectorAll(".preview-edge-path")].map((p) => ({
      d: p.getAttribute("d"),
      display: p.closest("g")?.style.display,
    }));
    const anchors = [...document.querySelectorAll(".flow-anchor-on")].map((a) => {
      const r = a.getBoundingClientRect();
      const host = a.closest(".token-chip, .token-def-label, .connector-chip");
      const hr = host?.getBoundingClientRect();
      return {
        side: a.getAttribute("data-flow-anchor"),
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
        host: host?.getAttribute("data-symbol-name"),
        hostLeft: hr?.left,
        hostRight: hr?.right,
        hostTop: hr?.top,
        hostBottom: hr?.bottom,
      };
    });
    return { paths, anchors };
  });

  console.log(JSON.stringify(wireInfo, null, 2));

  const gatewayRow = page.locator(".member-row-label", { hasText: "checkout" }).first();
  await gatewayRow.click();
  await page.waitForTimeout(400);
  const gatewayChip = page.locator('.token-chip[data-symbol-name="gateway"]').first();
  await gatewayChip.hover();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "hover-gateway.png") });

  await browser.close();
  console.log(`Screenshots in ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
