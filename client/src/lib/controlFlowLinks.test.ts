import { describe, expect, it } from "vitest";
import {
  buildControlFlowIndex,
  controlFlowAnchorFor,
  controlFlowGroup,
} from "@/lib/controlFlowLinks";
import { tokenizeLine } from "@/lib/tokenizeLine";

const MEMBER = "method:file:Svc.extractFieldValue";

function idxOf(line: string, text: string, occurrence = 0): number {
  const tokens = tokenizeLine(line).tokens;
  let seen = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i]!.text === text) {
      if (seen === occurrence) return i;
      seen++;
    }
  }
  return -1;
}

describe("buildControlFlowIndex — switch/case", () => {
  const CODE = `extractFieldValue(field: AddressFieldKind): string | null {
  const addr = result.address;
  if (!addr) return null;
  switch (field) {
    case 'city':
      return addr.city ?? null;
    case 'district': {
      return addr.district ?? null;
    }
    default:
      return null;
  }
}`;
  const lines = CODE.split("\n");
  const index = buildControlFlowIndex(MEMBER, CODE);

  it("indexes the switch head and every case/default branch", () => {
    const switchLineNo = lines.findIndex((l) => l.includes("switch (field)")) + 1;
    const switchTokenIdx = idxOf(lines[switchLineNo - 1]!, "switch");
    const head = controlFlowAnchorFor(index, switchLineNo, switchTokenIdx);
    expect(head?.role).toBe("head");

    const group = controlFlowGroup(index, head!.groupId)!;
    expect(group.kind).toBe("switch");
    expect(group.branches).toHaveLength(3);
    expect(group.branches.map((b) => b.label)).toEqual([
      "case 'city'",
      "case 'district'",
      "default",
    ]);
  });

  it("marks the discriminant identifier as a condition anchor on the same group", () => {
    const switchLineNo = lines.findIndex((l) => l.includes("switch (field)")) + 1;
    const fieldIdx = idxOf(lines[switchLineNo - 1]!, "field");
    const anchor = controlFlowAnchorFor(index, switchLineNo, fieldIdx);
    expect(anchor?.role).toBe("condition");

    const switchTokenIdx = idxOf(lines[switchLineNo - 1]!, "switch");
    const head = controlFlowAnchorFor(index, switchLineNo, switchTokenIdx)!;
    expect(anchor?.groupId).toBe(head.groupId);
  });

  it("does not treat the earlier if-statement's addr as part of the switch group", () => {
    const ifLineNo = lines.findIndex((l) => l.trim().startsWith("if (")) + 1;
    const ifTokenIdx = idxOf(lines[ifLineNo - 1]!, "if");
    const head = controlFlowAnchorFor(index, ifLineNo, ifTokenIdx);
    expect(head?.role).toBe("head");
    const group = controlFlowGroup(index, head!.groupId)!;
    expect(group.kind).toBe("if");
    expect(group.branches).toHaveLength(0);
  });
});

describe("buildControlFlowIndex — if / else if / else chain", () => {
  const CODE = `classify(n: number): string {
  if (n > 10) {
    return 'big';
  } else if (n > 0) {
    return 'small';
  } else {
    return 'zero';
  }
}`;
  const lines = CODE.split("\n");
  const index = buildControlFlowIndex(MEMBER, CODE);

  it("chains else-if and else as branches of the same if group", () => {
    const ifLineNo = lines.findIndex((l) => l.trim().startsWith("if (")) + 1;
    const ifTokenIdx = idxOf(lines[ifLineNo - 1]!, "if");
    const head = controlFlowAnchorFor(index, ifLineNo, ifTokenIdx)!;
    const group = controlFlowGroup(index, head.groupId)!;

    expect(group.branches.map((b) => b.label)).toEqual(["else if", "else"]);

    const elseIfLineNo = lines.findIndex((l) => l.includes("else if")) + 1;
    const elseTokenIdx = idxOf(lines[elseIfLineNo - 1]!, "else");
    expect(controlFlowAnchorFor(index, elseIfLineNo, elseTokenIdx)?.groupId).toBe(
      group.id,
    );

    const elseLineNo = lines.findIndex((l) => l.trim() === "} else {") + 1;
    const bareElseTokenIdx = idxOf(lines[elseLineNo - 1]!, "else");
    expect(controlFlowAnchorFor(index, elseLineNo, bareElseTokenIdx)?.groupId).toBe(
      group.id,
    );
  });

  it("closes the group after the final else block", () => {
    const ifLineNo = lines.findIndex((l) => l.trim().startsWith("if (")) + 1;
    const ifTokenIdx = idxOf(lines[ifLineNo - 1]!, "if");
    const head = controlFlowAnchorFor(index, ifLineNo, ifTokenIdx)!;
    const group = controlFlowGroup(index, head.groupId)!;
    expect(group.branches).toHaveLength(2);
  });
});

describe("buildControlFlowIndex — nested block inside a case", () => {
  it("does not let a case body's own braces close the switch early", () => {
    const code = `run(x: number): number {
  switch (x) {
    case 1: {
      const y = x;
      return y;
    }
    default:
      return 0;
  }
}`;
    const index = buildControlFlowIndex(MEMBER, code);
    const lines = code.split("\n");
    const switchLineNo = lines.findIndex((l) => l.includes("switch (x)")) + 1;
    const switchTokenIdx = idxOf(lines[switchLineNo - 1]!, "switch");
    const head = controlFlowAnchorFor(index, switchLineNo, switchTokenIdx)!;
    const group = controlFlowGroup(index, head.groupId)!;
    expect(group.branches.map((b) => b.label)).toEqual(["case 1", "default"]);
  });
});
