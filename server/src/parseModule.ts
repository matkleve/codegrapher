import { Node, type SourceFile } from "ts-morph";
import * as path from "path";
import {
  addEdge,
  addNode,
  fullTextStartLine,
  type ParseAccumulator,
} from "./parseAccumulator";
import { functionNodeId } from "./parseTypes";

export function parseModuleInto(
  acc: ParseAccumulator,
  filePath: string,
  sourceFile: SourceFile,
  maxNodes: number,
  options: { compoundClasses: boolean; includeFileNode: boolean },
): void {
  const { compoundClasses, includeFileNode } = options;
  const fileId = `file:${filePath}`;

  const moduleFunctions: { name: string; code: string; id: string; startLine: number }[] =
    [];

  for (const func of sourceFile.getFunctions()) {
    if (acc.limitReached) break;
    const name = func.getName();
    if (!name) continue;
    moduleFunctions.push({
      name,
      code: func.getFullText(),
      id: functionNodeId(filePath, name),
      startLine: fullTextStartLine(func),
    });
  }

  for (const varDecl of sourceFile.getVariableDeclarations()) {
    if (acc.limitReached) break;
    const initializer = varDecl.getInitializer();
    if (
      !initializer ||
      (!Node.isArrowFunction(initializer) && !Node.isFunctionExpression(initializer))
    ) {
      continue;
    }
    const name = varDecl.getName();
    moduleFunctions.push({
      name,
      code: varDecl.getFullText(),
      id: functionNodeId(filePath, name),
      startLine: fullTextStartLine(varDecl),
    });
  }

  if (moduleFunctions.length === 0) return;

  const moduleId = `module:${filePath}`;
  const moduleLabel = `${path.basename(filePath)} (module)`;

  if (
    !addNode(
      acc,
      {
        id: moduleId,
        type: "module",
        label: moduleLabel,
        filePath,
        code: "",
        startLine: 1,
        loaded: true,
      },
      maxNodes,
    )
  ) {
    return;
  }

  if (!compoundClasses && includeFileNode) {
    addEdge(acc, { source: fileId, target: moduleId, type: "contains" });
  }

  for (const fn of moduleFunctions) {
    if (acc.limitReached) break;
    if (
      !addNode(
        acc,
        {
          id: fn.id,
          type: "function",
          label: fn.name,
          filePath,
          code: fn.code,
          startLine: fn.startLine,
          loaded: true,
          parent: compoundClasses ? moduleId : undefined,
        },
        maxNodes,
      )
    ) {
      break;
    }
    if (!compoundClasses) {
      addEdge(acc, { source: moduleId, target: fn.id, type: "contains" });
    }
  }
}
