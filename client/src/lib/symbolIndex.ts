import { buildClassProperties } from "@/lib/classBody";
import type { ResolvableTokenKind, TokenKind } from "@/lib/tokenColors";
import { toFlowId } from "@/lib/graphIds";
import type { GraphData, GraphNode } from "@/types";

export type SymbolIndex = {
  classes: Map<string, string>;
  functions: Map<string, string>;
  variables: Set<string>;
  byId: Map<string, GraphNode>;
};

export type TokenReference = {
  graphNodeId: string;
  flowNodeId: string;
  classLabel: string;
  memberLabel?: string;
  line: number;
  filePath: string;
  kind: ResolvableTokenKind;
  inGraph: boolean;
};

const EMPTY: SymbolIndex = {
  classes: new Map(),
  functions: new Map(),
  variables: new Set(),
  byId: new Map(),
};

function extractFieldNames(code: string): string[] {
  const names: string[] = [];
  const re =
    /(?:public|private|protected|readonly|static|\s)*(\w+)\s*(?:[=:]|;)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    if (m[1] && !TS_RESERVED.has(m[1])) names.push(m[1]);
  }
  return names;
}

const TS_RESERVED = new Set([
  "constructor",
  "get",
  "set",
  "static",
  "public",
  "private",
  "protected",
  "readonly",
]);

export function buildSymbolIndex(graphData: GraphData | null): SymbolIndex {
  if (!graphData) return EMPTY;

  const byId = new Map(graphData.nodes.map((n) => [n.id, n]));
  const classes = new Map<string, string>();
  const functions = new Map<string, string>();
  const variables = new Set<string>();

  const methodsByParent = new Map<string, GraphNode[]>();
  for (const node of graphData.nodes) {
    if (node.type === "method" && node.parent) {
      const list = methodsByParent.get(node.parent) ?? [];
      list.push(node);
      methodsByParent.set(node.parent, list);
    }
  }

  for (const node of graphData.nodes) {
    if (node.type === "class" || node.type === "module") {
      classes.set(node.label, node.id);
      const methods = methodsByParent.get(node.id) ?? [];
      const rawMethods = methods.map((m) => ({
        id: m.id,
        label: m.label,
        code: m.code ?? "",
      }));
      const props = buildClassProperties(node.id, node.code ?? "", rawMethods);
      for (const p of props) {
        for (const name of extractFieldNames(p.code)) {
          variables.add(name);
        }
      }
    }
    if (node.type === "function" && !node.parent) {
      functions.set(node.label, node.id);
    }
    if (node.type === "method" || (node.type === "function" && node.parent)) {
      functions.set(node.label, node.id);
    }
  }

  return { classes, functions, variables, byId };
}

export function classifyIdentifier(
  name: string,
  index: SymbolIndex,
): TokenKind {
  if (index.classes.has(name)) return "class";
  if (index.functions.has(name)) return "function";
  if (index.variables.has(name)) return "variable";
  if (/^[A-Z]/.test(name)) return "class";
  if (/^[a-z_$]/.test(name)) return "unknown";
  return "plain";
}

export function isResolvableKind(kind: TokenKind): kind is ResolvableTokenKind {
  return kind === "function" || kind === "variable" || kind === "class";
}

export function resolveTokenFlowTarget(
  token: string,
  kind: ResolvableTokenKind,
  sourceGraphNodeId: string,
  index: SymbolIndex,
  graphData: GraphData | null,
): string | null {
  if (!graphData) return null;

  const sourceNode = index.byId.get(sourceGraphNodeId);
  const sourceFlow = toFlowId(sourceGraphNodeId);

  if (kind === "class") {
    const id = index.classes.get(token);
    if (id) {
      const flow = toFlowId(id);
      return flow !== sourceFlow ? flow : null;
    }
    if (sourceNode) {
      for (const edge of graphData.edges) {
        if (edge.type !== "imports" || edge.label !== token) continue;
        if (edge.source !== sourceGraphNodeId && edge.source !== sourceNode.parent) {
          continue;
        }
        const target = index.byId.get(edge.target);
        if (target && (target.type === "class" || target.type === "module")) {
          const flow = toFlowId(target.id);
          return flow !== sourceFlow ? flow : null;
        }
      }
    }
    return null;
  }

  if (kind === "function") {
    const methodId = index.functions.get(token);
    if (methodId) {
      const method = index.byId.get(methodId);
      if (method?.parent) {
        const flow = toFlowId(method.parent);
        return flow !== sourceFlow ? flow : null;
      }
      if (method) {
        const flow = toFlowId(method.id);
        return flow !== sourceFlow ? flow : null;
      }
    }
    return null;
  }

  if (kind === "variable") {
    const classId = index.classes.get(token);
    if (classId) {
      const flow = toFlowId(classId);
      return flow !== sourceFlow ? flow : null;
    }
    return null;
  }

  return null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parentClassLabel(node: GraphNode, index: SymbolIndex): string {
  if (!node.parent) return node.label;
  const parent = index.byId.get(node.parent);
  return parent?.label ?? node.label;
}

export function findTokenReferences(
  token: string,
  graphData: GraphData | null,
  index: SymbolIndex,
): TokenReference[] {
  if (!graphData || !token) return [];

  const re = new RegExp(`\\b${escapeRegExp(token)}\\b`, "g");
  const hits: TokenReference[] = [];

  for (const node of graphData.nodes) {
    const code = node.code ?? "";
    if (!code) continue;
    const lines = code.split("\n");
    const inGraph =
      index.classes.has(token) ||
      index.functions.has(token) ||
      index.variables.has(token);

    lines.forEach((line, i) => {
      re.lastIndex = 0;
      if (!re.test(line)) return;

      const lineNo = i + 1;
      let kind: ResolvableTokenKind = "function";
      if (index.classes.has(token)) kind = "class";
      else if (index.variables.has(token)) kind = "variable";
      else if (index.functions.has(token)) kind = "function";
      else if (/^[A-Z]/.test(token)) kind = "class";
      else kind = "variable";

      let flowNodeId: string;
      let memberLabel: string | undefined;
      let classLabel: string;

      if (node.type === "method" || (node.type === "function" && node.parent)) {
        const parent = node.parent ? index.byId.get(node.parent) : undefined;
        flowNodeId = parent ? toFlowId(parent.id) : toFlowId(node.id);
        classLabel = parent?.label ?? parentClassLabel(node, index);
        memberLabel = node.label;
      } else if (node.type === "class" || node.type === "module") {
        flowNodeId = toFlowId(node.id);
        classLabel = node.label;
      } else {
        flowNodeId = toFlowId(node.id);
        classLabel = node.label;
      }

      hits.push({
        graphNodeId: node.id,
        flowNodeId,
        classLabel,
        memberLabel,
        line: lineNo,
        filePath: node.filePath,
        kind,
        inGraph,
      });
    });
  }

  return hits;
}

export function countExternalOccurrences(
  token: string,
  filePath: string,
  graphData: GraphData | null,
): number {
  if (!graphData) return 0;
  const re = new RegExp(`\\b${escapeRegExp(token)}\\b`, "g");
  let count = 0;
  for (const node of graphData.nodes) {
    if (node.filePath !== filePath) continue;
    const code = node.code ?? "";
    const matches = code.match(re);
    if (matches) count += matches.length;
  }
  return count;
}
