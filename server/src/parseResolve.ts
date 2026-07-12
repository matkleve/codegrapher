import type { SourceFile } from "ts-morph";
import type { ParseAccumulator } from "./parseAccumulator";
import { classNodeId } from "./parseTypes";
import { resolveImportPath } from "./parsePaths";

export function resolveTypeNameToClassId(
  acc: ParseAccumulator,
  filePath: string,
  sourceFile: SourceFile,
  typeName: string,
): string | null {
  const trimmed = typeName.replace(/<.*>$/, "").trim();
  const local = classNodeId(filePath, trimmed);
  if (acc.nodeIds.has(local)) return local;

  for (const importDecl of sourceFile.getImportDeclarations()) {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    if (!moduleSpecifier.startsWith(".")) continue;
    const resolved = resolveImportPath(filePath, moduleSpecifier);
    if (!resolved) continue;

    for (const named of importDecl.getNamedImports()) {
      if (named.getName() === trimmed) {
        return resolveTargetClassId(acc, resolved, trimmed);
      }
    }
    const defaultImport = importDecl.getDefaultImport();
    if (defaultImport?.getText() === trimmed) {
      return resolveTargetClassId(acc, resolved, trimmed);
    }
  }

  return null;
}

function getClassIdsForFile(acc: ParseAccumulator, filePath: string): string[] {
  const prefix = `class:${filePath}:`;
  return acc.nodes
    .filter((n) => n.type === "class" && n.id.startsWith(prefix))
    .map((n) => n.id);
}

export function resolveTargetClassId(
  acc: ParseAccumulator,
  resolvedFile: string,
  symbolName: string,
): string | null {
  const exact = classNodeId(resolvedFile, symbolName);
  if (acc.nodeIds.has(exact)) return exact;
  const classes = getClassIdsForFile(acc, resolvedFile);
  return classes[0] ?? null;
}
