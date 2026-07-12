/**
 * Hover/trace hot-path benchmarks (vitest + happy-dom).
 * Run: npm test -- src/lib/traceHoverPerf.test.ts
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { assembleCodeLinePreviewEdges } from "@/lib/codeLineTraceEdges";
import { computeTraceLit, EMPTY_TRACE_LIT, mergeTraceLit } from "@/lib/computeTraceLit";
import { buildControlFlowIndex } from "@/lib/controlFlowLinks";
import { buildMemberSymbolIndex } from "@/lib/localSymbolLinks";
import { registerTraceHost } from "@/lib/elementRegistry";
import { makeUsageTokenKey } from "@/lib/traceKeys";
import { applyTraceLit, clearTraceLit } from "@/lib/traceLitController";
import { createRefinePreviewEdgeCache } from "@/lib/refinePreviewEdgeCache";
import { setTraceSessionActive } from "@/lib/wireHoverBoost";
import { createWireEngine } from "@/lib/wireEngine";
import { createWireGroup, updateWireGeometry, type WireElements } from "@/lib/previewEdgeDom";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";

const MEMBER = "fn:file:OrderService.ts::checkout";
const FLOW = "flow:file:OrderService.ts";
const START = 26;

const CODE = `  async checkout(id: string): Promise<boolean> {
    const amount = this.orders.get(id);
    if (amount === undefined) return false;
    return this.gateway.charge(id, amount);
  }`;

function median(samples: number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

function bench(label: string, fn: () => void, iterations = 50): number {
  // warm-up
  for (let i = 0; i < 5; i++) fn();
  const samples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    fn();
    samples.push(performance.now() - t0);
  }
  const med = median(samples);
  // eslint-disable-next-line no-console -- perf report
  console.log(`[perf] ${label}: median ${med.toFixed(2)}ms (p95 ${sortedP95(samples).toFixed(2)}ms)`);
  return med;
}

function sortedP95(samples: number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.95)]!;
}

function buildTokenGrid(count: number): HTMLElement {
  const pane = document.createElement("div");
  pane.className = "graph-pane graph-trace-active";
  const row = document.createElement("div");
  row.className = "member-row";
  const line = document.createElement("div");
  line.className = "code-line";
  line.dataset.lineNumber = String(START + 1);

  for (let i = 0; i < count; i++) {
    const chip = document.createElement("span");
    chip.className = "token-chip cursor-pointer";
    chip.dataset.tokenKind = i % 2 === 0 ? "function" : "variable";
    chip.dataset.traceKey = makeUsageTokenKey(FLOW, MEMBER, START + 1, i, `tok${i}`);
    const text = document.createElement("span");
    text.className = "token-chip-text";
    text.textContent = `tok${i}`;
    chip.append(text);
    const socket = document.createElement("span");
    socket.dataset.flowAnchor = "right";
    socket.className = "flow-anchor-off bg-border";
    chip.append(socket);
    line.append(chip);
    registerTraceHost(chip);
  }

  row.append(line);
  pane.append(row);
  document.body.append(pane);
  return pane;
}

function wireSpec(id: string, from: HTMLElement, to: HTMLElement): PreviewEdgeSpec {
  return {
    id,
    kind: "function",
    connectionKind: "usage",
    from: { type: "element", el: from, side: "right" },
    to: { type: "element", el: to, side: "left" },
  };
}

describe("trace hover perf", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    clearTraceLit();
    setTraceSessionActive(false);
    document.body.innerHTML = "";
  });

  it("reports hot-path timings (see console)", () => {
    const index = buildMemberSymbolIndex(MEMBER, CODE, START);
    const pane = buildTokenGrid(120);
    const chips = [...pane.querySelectorAll<HTMLElement>(".token-chip")];
    const focus = chips[0]!;
    const target = chips[1]!;

    const edges = assembleCodeLinePreviewEdges({
      name: "amount",
      chipEl: focus,
      kind: "variable",
      tokenIndex: 0,
      edgeKey: "perf-edge",
      symbolIndex: index,
      controlFlowIndex: buildControlFlowIndex(MEMBER, CODE, START),
      sourceFlowId: FLOW,
      memberId: MEMBER,
      lineNumber: START + 1,
      symbols: new Map(),
      graphData: null,
      getNode: () => undefined,
      hasSymbol: () => false,
      lookup: () => undefined,
      cascadeEdges: [],
    });

    const cache = createRefinePreviewEdgeCache();
    const tokenKey = focus.dataset.traceKey!;

    const edgeBuildMs = bench("assembleCodeLinePreviewEdges", () => {
      assembleCodeLinePreviewEdges({
        name: "amount",
        chipEl: focus,
        kind: "variable",
        tokenIndex: 0,
        edgeKey: "perf-edge",
        symbolIndex: index,
        controlFlowIndex: buildControlFlowIndex(MEMBER, CODE, START),
        sourceFlowId: FLOW,
        memberId: MEMBER,
        lineNumber: START + 1,
        symbols: new Map(),
        graphData: null,
        getNode: () => undefined,
        hasSymbol: () => false,
        lookup: () => undefined,
        cascadeEdges: [],
      });
    });

    const computeLitMs = bench("computeTraceLit (8 edges)", () => {
      const specs = Array.from({ length: 8 }, (_, i) =>
        wireSpec(`e${i}`, chips[i * 2]!, chips[i * 2 + 1] ?? target),
      );
      computeTraceLit(tokenKey, specs, () => undefined, cache);
    });

    setTraceSessionActive(true);
    const lit = computeTraceLit(
      tokenKey,
      edges.length > 0 ? edges : [wireSpec("e0", focus, target)],
      () => undefined,
      cache,
    );

    const applyLitMs = bench("applyTraceLit (120 chips in DOM)", () => {
      applyTraceLit(lit, {
        pinnedTokenKeys: new Set(),
        hoveredTokenKey: tokenKey,
        previewEdges: edges,
        getNode: () => undefined,
      });
    });

    // Simulate wire engine: one tick × N wires (layout reads)
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 }) as DOMRect;
    document.body.append(svg);
    const layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svg.append(layer);
    const wires = new Map<string, WireElements>();
    const specs: PreviewEdgeSpec[] = [];
    for (let i = 0; i < 12; i++) {
      const spec = wireSpec(`wire-${i}`, chips[i * 2]!, chips[i * 2 + 1] ?? target);
      specs.push(spec);
      const wire = createWireGroup(spec, false);
      wires.set(spec.id, wire);
      layer.append(wire.group);
    }

    const wireTickMs = bench("wireEngine tickOnce (12 wires)", () => {
      const box = svg.getBoundingClientRect();
      for (const spec of specs) {
        const wire = wires.get(spec.id);
        if (wire) updateWireGeometry(wire, box, () => undefined, specs);
      }
    });

  // ~6 frames during 100ms settle loop after each trace commit
    const wireSettleMs = wireTickMs * 6;

    // eslint-disable-next-line no-console -- perf report
    console.log(
      `[perf] estimated wire settle (6 RAF ticks): ~${wireSettleMs.toFixed(2)}ms`,
    );
    // eslint-disable-next-line no-console -- perf report
    console.log(
      `[perf] estimated trace commit (edge+lit+apply+settle): ~${(
        edgeBuildMs +
        computeLitMs +
        applyLitMs +
        wireSettleMs
      ).toFixed(2)}ms`,
    );
    // eslint-disable-next-line no-console -- perf report
    console.log(
      `[perf] intentional dwell (FIRE_COLD_MS) + motion-dim crossfade: 80ms + 80ms = 160ms minimum perceived`,
    );

    expect(edgeBuildMs).toBeLessThan(50);
    expect(computeLitMs).toBeLessThan(30);
    expect(applyLitMs).toBeLessThan(40);
    expect(wireTickMs).toBeLessThan(25);
  });
});
