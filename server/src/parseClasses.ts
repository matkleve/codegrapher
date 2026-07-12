import type { SourceFile } from "ts-morph";
import * as path from "path";
import {
  addEdge,
  addNode,
  fullTextStartLine,
  type ParseAccumulator,
} from "./parseAccumulator";
import { classNodeId, methodNodeId } from "./parseTypes";

export function parseClassesInto(
  acc: ParseAccumulator,
  filePath: string,
  sourceFile: SourceFile,
  maxNodes: number,
  options: { compoundClasses: boolean; includeFileNode: boolean },
): void {
  const { compoundClasses, includeFileNode } = options;
  const fileId = `file:${filePath}`;

  for (const classDecl of sourceFile.getClasses()) {
    if (acc.limitReached) break;

    const className = classDecl.getName() ?? "AnonymousClass";
    const classId = classNodeId(filePath, className);

    if (
      !addNode(
        acc,
        {
          id: classId,
          type: "class",
          label: className,
          filePath,
          code: classDecl.getFullText(),
          startLine: fullTextStartLine(classDecl),
          loaded: true,
        },
        maxNodes,
      )
    ) {
      break;
    }

    if (!compoundClasses && includeFileNode) {
      addEdge(acc, { source: fileId, target: classId, type: "contains" });
    }

    for (const method of classDecl.getMethods()) {
      if (acc.limitReached) break;

      const methodName = method.getName();
      const methodId = methodNodeId(filePath, className, methodName);

      if (
        !addNode(
          acc,
          {
            id: methodId,
            type: "method",
            label: methodName,
            filePath,
            code: method.getFullText(),
            startLine: fullTextStartLine(method),
            loaded: true,
            parent: compoundClasses ? classId : undefined,
          },
          maxNodes,
        )
      ) {
        break;
      }

      if (!compoundClasses) {
        addEdge(acc, { source: classId, target: methodId, type: "contains" });
      }
    }
  }
}
