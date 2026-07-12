import type { SourceFile } from "ts-morph";
import { addNode, fullTextStartLine, type ParseAccumulator } from "./parseAccumulator";
import { classNodeId } from "./parseTypes";

export function parseInterfacesInto(
  acc: ParseAccumulator,
  filePath: string,
  sourceFile: SourceFile,
  maxNodes: number,
): void {
  for (const iface of sourceFile.getInterfaces()) {
    if (acc.limitReached) break;
    const ifaceName = iface.getName();
    if (!ifaceName) continue;
    const ifaceId = classNodeId(filePath, ifaceName);
    if (acc.nodeIds.has(ifaceId)) continue;
    addNode(
      acc,
      {
        id: ifaceId,
        type: "class",
        label: ifaceName,
        filePath,
        code: iface.getFullText(),
        startLine: fullTextStartLine(iface),
        loaded: true,
      },
      maxNodes,
    );
  }

  for (const typeAlias of sourceFile.getTypeAliases()) {
    if (acc.limitReached) break;
    const aliasName = typeAlias.getName();
    if (!aliasName) continue;
    const aliasId = classNodeId(filePath, aliasName);
    if (acc.nodeIds.has(aliasId)) continue;
    addNode(
      acc,
      {
        id: aliasId,
        type: "class",
        label: aliasName,
        filePath,
        code: typeAlias.getFullText(),
        startLine: fullTextStartLine(typeAlias),
        loaded: true,
      },
      maxNodes,
    );
  }
}
