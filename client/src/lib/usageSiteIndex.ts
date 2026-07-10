import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import type { Node } from "@xyflow/react";

const WORD_RE = /\b([A-Za-z_][A-Za-z0-9_]*)\b/g;

export type UsageSiteRecord = {
  flowNodeId: string;
  memberId: string;
  lineNumber: number;
  line: string;
};

/** Precompute symbol → usage sites from visible class node method bodies. */
export function buildUsageSiteIndex(
  nodes: Node[],
  indexedSymbols: ReadonlySet<string>,
): Map<string, UsageSiteRecord[]> {
  const index = new Map<string, UsageSiteRecord[]>();

  if (indexedSymbols.size === 0) return index;

  const add = (token: string, record: UsageSiteRecord) => {
    const list = index.get(token);
    if (list) {
      list.push(record);
      return;
    }
    index.set(token, [record]);
  };

  for (const node of nodes) {
    if (node.type !== "class") continue;
    const classData = node.data as ClassNodeData;
    const flowNodeId = node.id;

    for (const method of classData.methods) {
      const lines = method.code.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? "";
        const lineNumber = i + 1;
        WORD_RE.lastIndex = 0;
        let match: RegExpExecArray | null;
        const seenOnLine = new Set<string>();
        while ((match = WORD_RE.exec(line)) !== null) {
          const token = match[1]!;
          if (!indexedSymbols.has(token) || seenOnLine.has(token)) continue;
          seenOnLine.add(token);
          add(token, {
            flowNodeId,
            memberId: method.id,
            lineNumber,
            line,
          });
        }
      }
    }
  }

  return index;
}
