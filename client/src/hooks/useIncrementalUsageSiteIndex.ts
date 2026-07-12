import { useMemo, useRef } from "react";
import type { Node } from "@xyflow/react";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import {
  indexUsageSitesForNode,
  mergeUsageSiteMaps,
  type UsageSiteRecord,
} from "@/lib/usageSiteIndex";

function fingerprintClassNode(node: Node): string {
  const data = node.data as ClassNodeData;
  const methods = (data.methods ?? [])
    .map((m) => `${m.id}:${m.code?.length ?? 0}:${m.startLine ?? 0}`)
    .join("|");
  const properties = (data.properties ?? [])
    .map((p) => `${p.id}:${p.code?.length ?? 0}:${p.startLine ?? 0}`)
    .join("|");
  return `${methods};${properties}`;
}

type NodeCacheEntry = {
  fp: string;
  index: Map<string, UsageSiteRecord[]>;
};

/** Re-scan only class nodes whose method/property code changed. */
export function useIncrementalUsageSiteIndex(
  nodes: Node[],
  indexedSymbols: ReadonlySet<string>,
): Map<string, UsageSiteRecord[]> {
  const cacheRef = useRef(new Map<string, NodeCacheEntry>());
  const lastMergedRef = useRef(new Map<string, UsageSiteRecord[]>());
  const lastSignatureRef = useRef("");

  return useMemo(() => {
    if (indexedSymbols.size === 0) {
      cacheRef.current.clear();
      lastSignatureRef.current = "";
      lastMergedRef.current = new Map();
      return lastMergedRef.current;
    }

    const merged = new Map<string, UsageSiteRecord[]>();
    const activeIds = new Set<string>();
    const signatureParts: string[] = [`sym:${indexedSymbols.size}`];
    let classNodeCount = 0;

    for (const node of nodes) {
      if (node.type !== "class") continue;
      classNodeCount++;
      activeIds.add(node.id);

      const fp = fingerprintClassNode(node);
      signatureParts.push(`${node.id}:${fp}`);
      const cached = cacheRef.current.get(node.id);
      const partial =
        cached?.fp === fp
          ? cached.index
          : indexUsageSitesForNode(node, indexedSymbols);

      if (cached?.fp !== fp) {
        cacheRef.current.set(node.id, { fp, index: partial });
      }

      mergeUsageSiteMaps(merged, partial);
    }

    for (const id of [...cacheRef.current.keys()]) {
      if (!activeIds.has(id)) cacheRef.current.delete(id);
    }

    if (classNodeCount === 0) {
      lastSignatureRef.current = "";
      lastMergedRef.current = new Map();
      return lastMergedRef.current;
    }

    const signature = signatureParts.sort().join("|");
    if (signature === lastSignatureRef.current) {
      return lastMergedRef.current;
    }

    lastSignatureRef.current = signature;
    lastMergedRef.current = merged;
    return merged;
  }, [nodes, indexedSymbols]);
}
