import type { SourceFile } from "ts-morph";
import * as path from "path";
import { addEdge, type ParseAccumulator } from "./parseAccumulator";
import { classNodeId } from "./parseTypes";
import { resolveImportPath } from "./parsePaths";
import { resolveTargetClassId, resolveTypeNameToClassId } from "./parseResolve";

export function addClassImportEdges(
  acc: ParseAccumulator,
  filePath: string,
  sourceFile: SourceFile,
): void {
  const prefix = `class:${filePath}:`;
  const sourceClasses = acc.nodes
    .filter((n) => n.type === "class" && n.id.startsWith(prefix))
    .map((n) => n.id);
  if (sourceClasses.length === 0) return;
  const defaultSource = sourceClasses[0];

  for (const importDecl of sourceFile.getImportDeclarations()) {
    if (acc.limitReached) break;

    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    if (!moduleSpecifier.startsWith(".")) continue;

    const resolved = resolveImportPath(filePath, moduleSpecifier);
    if (!resolved) continue;

    const namedImports = importDecl.getNamedImports();
    if (namedImports.length > 0) {
      for (const named of namedImports) {
        const name = named.getName();
        const target = resolveTargetClassId(acc, resolved, name);
        if (target) {
          addEdge(acc, {
            source: defaultSource,
            target,
            type: "imports",
            label: name,
          });
        }
      }
      continue;
    }

    const defaultImport = importDecl.getDefaultImport();
    const namespaceImport = importDecl.getNamespaceImport();
    const label =
      defaultImport?.getText() ??
      namespaceImport?.getText() ??
      path.basename(resolved).replace(/\.tsx?$/, "");

    const targets = acc.nodes
      .filter((n) => n.type === "class" && n.id.startsWith(`class:${resolved}:`))
      .map((n) => n.id);
    const target = targets[0];
    if (target) {
      addEdge(acc, {
        source: defaultSource,
        target,
        type: "imports",
        label,
      });
    }
  }
}

function addExtendsEdges(
  acc: ParseAccumulator,
  filePath: string,
  sourceFile: SourceFile,
): void {
  for (const classDecl of sourceFile.getClasses()) {
    if (acc.limitReached) break;
    const className = classDecl.getName();
    if (!className) continue;

    const extendsExpr = classDecl.getExtends();
    if (!extendsExpr) continue;

    const parentName = extendsExpr.getExpression().getText();
    const parentId = resolveTypeNameToClassId(acc, filePath, sourceFile, parentName);
    if (!parentId) continue;

    addEdge(acc, {
      source: classNodeId(filePath, className),
      target: parentId,
      type: "extends",
    });
  }
}

function addImplementsEdges(
  acc: ParseAccumulator,
  filePath: string,
  sourceFile: SourceFile,
): void {
  for (const classDecl of sourceFile.getClasses()) {
    if (acc.limitReached) break;
    const className = classDecl.getName();
    if (!className) continue;

    const childId = classNodeId(filePath, className);
    for (const impl of classDecl.getImplements()) {
      const ifaceName = impl.getExpression().getText();
      const targetId = resolveTypeNameToClassId(acc, filePath, sourceFile, ifaceName);
      if (!targetId) continue;
      addEdge(acc, {
        source: childId,
        target: targetId,
        type: "implements",
        label: ifaceName,
      });
    }
  }
}

function addCompositionEdges(
  acc: ParseAccumulator,
  filePath: string,
  sourceFile: SourceFile,
): void {
  for (const classDecl of sourceFile.getClasses()) {
    if (acc.limitReached) break;
    const className = classDecl.getName();
    if (!className) continue;

    const ownerId = classNodeId(filePath, className);
    const ctor = classDecl.getConstructors()[0];
    if (!ctor) continue;

    for (const param of ctor.getParameters()) {
      const scope = param.getScope();
      if (scope === undefined) continue;

      const typeNode = param.getTypeNode();
      if (!typeNode) continue;

      const depName = typeNode.getText().replace(/<.*>$/, "").trim();
      const depId = resolveTypeNameToClassId(acc, filePath, sourceFile, depName);
      if (!depId || depId === ownerId) continue;

      addEdge(acc, {
        source: ownerId,
        target: depId,
        type: "composition",
        label: param.getName(),
      });
    }
  }
}

export function addStructuralEdges(
  acc: ParseAccumulator,
  filePath: string,
  sourceFile: SourceFile,
): void {
  addExtendsEdges(acc, filePath, sourceFile);
  addImplementsEdges(acc, filePath, sourceFile);
  addCompositionEdges(acc, filePath, sourceFile);
}
