import { getByTraceKey } from "@/lib/elementRegistry";
import { findLocalDefElement } from "@/lib/localDefElements";
import { graphPane } from "@/lib/graphPaneDom";
import { makeSigParamDefKey, makeSignatureTypeKey, makeUsageTokenKey } from "@/lib/traceKeys";
import { tokenizeLine } from "@/lib/tokenizeLine";
import type { Node } from "@xyflow/react";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";

function getClassNodeData(
  flowNodeId: string,
  getNode: (id: string) => Node | undefined,
): ClassNodeData | null {
  const node = getNode(flowNodeId);
  if (!node || node.type !== "class") return null;
  return node.data as ClassNodeData;
}

/** Token index of `symbolName` in `paramName: symbolName` on a signature source line. */
export function typeTokenIndexOnParamSignature(
  signatureSource: string,
  paramName: string,
  symbolName: string,
): number | null {
  const tokens = tokenizeLine(signatureSource).tokens;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i]?.kind !== "identifier" || tokens[i]?.text !== paramName) continue;
    let j = i + 1;
    while (j < tokens.length && tokens[j]?.kind === "whitespace") j++;
    if (tokens[j]?.text !== ":") continue;
    j++;
    while (j < tokens.length && tokens[j]?.kind === "whitespace") j++;
    if (tokens[j]?.kind === "identifier" && tokens[j]?.text === symbolName) {
      return j;
    }
  }
  return null;
}

/** Param name for `paramName: symbolName` on a signature source line (not return types). */
export function paramNameForSignatureType(
  signatureSource: string,
  symbolName: string,
): string | null {
  const tokens = tokenizeLine(signatureSource).tokens;
  for (let j = 0; j < tokens.length; j++) {
    if (tokens[j]?.kind !== "identifier" || tokens[j]?.text !== symbolName) continue;
    let k = j - 1;
    while (k >= 0 && tokens[k]?.kind === "whitespace") k--;
    if (tokens[k]?.text !== ":") continue;
    k--;
    while (k >= 0 && tokens[k]?.kind === "whitespace") k--;
    const param = tokens[k];
    if (param?.kind !== "identifier") continue;
    if (param.text === ")" || param.text === "(") continue;
    return param.text;
  }
  return null;
}

function findChipByTraceKey(
  pane: HTMLElement,
  traceKey: string,
): HTMLElement | null {
  const registered = getByTraceKey(traceKey);
  if (registered?.isConnected) return registered;
  return pane.querySelector<HTMLElement>(
    `[data-trace-key="${CSS.escape(traceKey)}"]`,
  );
}

/** Inline `param: Type` token on the expanded method signature line (preferred). */
export function findBodyParamTypeChip(
  flowNodeId: string,
  memberId: string,
  paramName: string,
  symbolName: string,
  getNode: (id: string) => Node | undefined,
): HTMLElement | null {
  const pane = graphPane();
  const classData = getClassNodeData(flowNodeId, getNode);
  const method = classData?.methods.find((m) => m.id === memberId);
  if (!pane || !method?.code) return null;

  const lines = method.code.split("\n");
  const bodyStart = lines.findIndex((line) => line.includes("{"));

  for (let offset = 0; offset < lines.length; offset++) {
    if (bodyStart >= 0 && offset > bodyStart) break;
    const rawLine = lines[offset]!;
    const lineText = rawLine.includes("{")
      ? rawLine.slice(0, rawLine.indexOf("{"))
      : rawLine;
    const tokenIndex = typeTokenIndexOnParamSignature(lineText, paramName, symbolName);
    if (tokenIndex == null) continue;

    const lineNumber = method.startLine + offset;
    const traceKey = makeUsageTokenKey(
      flowNodeId,
      memberId,
      lineNumber,
      tokenIndex,
      symbolName,
    );
    const el = findChipByTraceKey(pane, traceKey);
    if (el?.isConnected && el.closest(".member-body-wrap")) return el;
  }
  return null;
}

/** Header summary chip scoped to one param's `name: Type` pair (not return area). */
export function findHeaderParamTypeChip(
  flowNodeId: string,
  memberId: string,
  paramName: string,
  symbolName: string,
): HTMLElement | null {
  const pane = graphPane();
  if (!pane) return null;

  const paramKey = makeSigParamDefKey(flowNodeId, memberId, paramName);
  const paramEl = findChipByTraceKey(pane, paramKey);
  if (!paramEl) return null;

  const group = paramEl.closest(".member-sig-value--in");
  if (!group) return null;

  const typeKey = makeSignatureTypeKey(flowNodeId, memberId, symbolName);
  const inGroup = group.querySelector<HTMLElement>(
    `[data-trace-key="${CSS.escape(typeKey)}"]`,
  );
  return inGroup?.isConnected ? inGroup : null;
}

/** Inline signature-line param def, preferred over the header input tag. */
export function findParamDefChip(
  flowNodeId: string,
  memberId: string,
  paramName: string,
): HTMLElement | null {
  const pane = graphPane();
  if (!pane) return null;

  const header = findChipByTraceKey(
    pane,
    makeSigParamDefKey(flowNodeId, memberId, paramName),
  );
  const localDefId = header?.dataset.localDefId;
  if (localDefId) {
    const preferred = findLocalDefElement(pane, localDefId);
    if (preferred?.isConnected) return preferred;
  }
  return header?.isConnected ? header : null;
}

/** Prefer inline signature-line type, then header input tag — never return area. */
export function findParamTypeChip(
  flowNodeId: string,
  memberId: string,
  paramName: string,
  symbolName: string,
  getNode: (id: string) => Node | undefined,
): HTMLElement | null {
  return (
    findBodyParamTypeChip(flowNodeId, memberId, paramName, symbolName, getNode) ??
    findHeaderParamTypeChip(flowNodeId, memberId, paramName, symbolName)
  );
}

export function isHeaderSignatureEl(el: HTMLElement): boolean {
  return Boolean(el.closest(".member-signature-tags"));
}

/** Sig-type chip on the same surface as the hovered param (header summary vs body line). */
export function findParamTypeChipCoLocated(
  flowNodeId: string,
  memberId: string,
  paramName: string,
  symbolName: string,
  paramEl: HTMLElement,
  getNode: (id: string) => Node | undefined,
): HTMLElement | null {
  if (isHeaderSignatureEl(paramEl)) {
    return (
      findSigTypeInSigValueGroup(paramEl, flowNodeId, memberId, symbolName) ??
      findHeaderParamTypeChip(flowNodeId, memberId, paramName, symbolName)
    );
  }
  return (
    findBodyParamTypeChip(flowNodeId, memberId, paramName, symbolName, getNode) ??
    findHeaderParamTypeChip(flowNodeId, memberId, paramName, symbolName)
  );
}

/** Param def chip in the same header `name: Type` pill as `peerEl`. */
export function findParamDefInSigValueGroup(
  peerEl: HTMLElement,
  flowNodeId: string,
  memberId: string,
  paramName: string,
): HTMLElement | null {
  const group = peerEl.closest(".member-sig-value--in");
  if (!group) return null;
  const paramKey = makeSigParamDefKey(flowNodeId, memberId, paramName);
  return group.querySelector<HTMLElement>(
    `[data-trace-key="${CSS.escape(paramKey)}"]`,
  );
}

/** Sig-type chip in the same header `name: Type` pill as `peerEl`. */
export function findSigTypeInSigValueGroup(
  peerEl: HTMLElement,
  flowNodeId: string,
  memberId: string,
  symbolName: string,
): HTMLElement | null {
  const group = peerEl.closest(".member-sig-value--in");
  if (!group) return null;
  const typeKey = makeSignatureTypeKey(flowNodeId, memberId, symbolName);
  return group.querySelector<HTMLElement>(
    `[data-trace-key="${CSS.escape(typeKey)}"]`,
  );
}

/** Param def chip paired with a sig-type on the same surface (header vs body). */
export function findParamDefCoLocated(
  flowNodeId: string,
  memberId: string,
  paramName: string,
  peerEl: HTMLElement,
  paramDefId?: string,
): HTMLElement | null {
  if (isHeaderSignatureEl(peerEl)) {
    return (
      findParamDefInSigValueGroup(peerEl, flowNodeId, memberId, paramName) ??
      (() => {
        const pane = graphPane();
        return pane
          ? findChipByTraceKey(pane, makeSigParamDefKey(flowNodeId, memberId, paramName))
          : null;
      })()
    );
  }
  const onLine = findParamDefOnCodeLine(peerEl, paramName, paramDefId);
  if (onLine?.isConnected) return onLine;
  return findParamDefChip(flowNodeId, memberId, paramName);
}

function findParamDefOnCodeLine(
  peerEl: HTMLElement,
  paramName: string,
  paramDefId?: string,
): HTMLElement | null {
  const line = peerEl.closest(".code-line");
  if (!line) return null;
  if (paramDefId) {
    const byId = line.querySelector<HTMLElement>(
      `[data-local-def-id="${CSS.escape(paramDefId)}"]`,
    );
    if (byId?.isConnected) return byId;
  }
  for (const chip of line.querySelectorAll<HTMLElement>("[data-local-def-id]")) {
    if (chip.dataset.symbolName === paramName) return chip;
  }
  return null;
}
