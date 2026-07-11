import { Project, Node, type SourceFile } from "ts-morph";
import * as fs from "fs";
import * as path from "path";

export const MAX_FOCUS_NODES = 50;

export interface GraphNode {
  id: string;
  type: "file" | "class" | "function" | "method" | "module";
  label: string;
  filePath: string;
  code: string;
  loaded?: boolean;
  parent?: string;
}

export type StructuralEdgeType =
  | "extends"
  | "implements"
  | "composition"
  | "imports";

export interface GraphEdge {
  source: string;
  target: string;
  type: "contains" | "imports" | "calls" | StructuralEdgeType;
  label?: string;
}

export interface FocusResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  truncated?: boolean;
  focusFile: string;
}

function isTsFile(filePath: string): boolean {
  return /\.tsx?$/.test(filePath);
}

/** Graph-node id conventions shared with the symbol index (`indexer.ts` enclosingSymbol). */
export function classNodeId(filePath: string, className: string): string {
  return `class:${filePath}:${className}`;
}

export function methodNodeId(filePath: string, className: string, methodName: string): string {
  return `method:${filePath}:${className}.${methodName}`;
}

export function functionNodeId(filePath: string, name: string): string {
  return `function:${filePath}:${name}`;
}

export function resolveImportPath(fromFile: string, moduleSpecifier: string): string | null {
  const base = path.resolve(path.dirname(fromFile), moduleSpecifier);
  if (fs.existsSync(base) && fs.statSync(base).isFile()) {
    return path.normalize(base);
  }
  for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const candidate = base + ext;
    if (fs.existsSync(candidate)) {
      return path.normalize(candidate);
    }
  }
  return null;
}

function getRelativeImports(sourceFile: SourceFile, fromFile: string): string[] {
  const imports: string[] = [];
  for (const importDecl of sourceFile.getImportDeclarations()) {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    if (!moduleSpecifier.startsWith(".")) continue;
    const resolved = resolveImportPath(fromFile, moduleSpecifier);
    if (resolved) imports.push(resolved);
  }
  return imports;
}

function collectFilesWithinDepth(focusFile: string, depth: number): Set<string> {
  const focus = path.normalize(path.resolve(focusFile));
  const files = new Set<string>([focus]);
  const queue: { file: string; hop: number }[] = [{ file: focus, hop: 0 }];
  const project = new Project({ skipAddingFilesFromTsConfig: true });

  while (queue.length > 0) {
    const { file, hop } = queue.shift()!;
    if (hop >= depth) continue;

    const sourceFile = project.addSourceFileAtPath(file);
    for (const imported of getRelativeImports(sourceFile, file)) {
      if (!files.has(imported)) {
        files.add(imported);
        queue.push({ file: imported, hop: hop + 1 });
      }
    }
  }

  return files;
}

interface ParseAccumulator {
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodeIds: Set<string>;
  edgeKeys: Set<string>;
  limitReached: boolean;
  truncated: boolean;
}

function createAccumulator(): ParseAccumulator {
  return {
    nodes: [],
    edges: [],
    nodeIds: new Set(),
    edgeKeys: new Set(),
    limitReached: false,
    truncated: false,
  };
}

function addEdge(acc: ParseAccumulator, edge: GraphEdge) {
  const key = `${edge.source}|${edge.target}|${edge.type}|${edge.label ?? ""}`;
  if (acc.edgeKeys.has(key)) return;
  acc.edgeKeys.add(key);
  acc.edges.push(edge);
}

function addNode(acc: ParseAccumulator, node: GraphNode, maxNodes: number): boolean {
  if (acc.nodeIds.has(node.id)) return true;
  if (acc.nodes.length >= maxNodes) {
    acc.limitReached = true;
    acc.truncated = true;
    return false;
  }
  acc.nodeIds.add(node.id);
  acc.nodes.push(node);
  return true;
}

function getClassIdsForFile(acc: ParseAccumulator, filePath: string): string[] {
  const prefix = `class:${filePath}:`;
  return acc.nodes
    .filter((n) => n.type === "class" && n.id.startsWith(prefix))
    .map((n) => n.id);
}

function resolveTargetClassId(
  acc: ParseAccumulator,
  resolvedFile: string,
  symbolName: string,
): string | null {
  const exact = classNodeId(resolvedFile, symbolName);
  if (acc.nodeIds.has(exact)) return exact;
  const classes = getClassIdsForFile(acc, resolvedFile);
  return classes[0] ?? null;
}

function addClassImportEdges(
  acc: ParseAccumulator,
  filePath: string,
  sourceFile: SourceFile,
): void {
  const sourceClasses = getClassIdsForFile(acc, filePath);
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

    const targets = getClassIdsForFile(acc, resolved);
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

function resolveTypeNameToClassId(
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

function addStructuralEdges(
  acc: ParseAccumulator,
  filePath: string,
  sourceFile: SourceFile,
): void {
  addExtendsEdges(acc, filePath, sourceFile);
  addImplementsEdges(acc, filePath, sourceFile);
  addCompositionEdges(acc, filePath, sourceFile);
}

function parseFileInto(
  acc: ParseAccumulator,
  filePath: string,
  sourceFile: SourceFile,
  maxNodes: number,
  options: { compoundClasses: boolean; includeFileNode: boolean },
): void {
  const { compoundClasses, includeFileNode } = options;
  const fileId = `file:${filePath}`;

  if (includeFileNode) {
    if (
      !addNode(
        acc,
        {
          id: fileId,
          type: "file",
          label: path.basename(filePath),
          filePath,
          code: sourceFile.getFullText(),
          loaded: true,
        },
        maxNodes,
      )
    ) {
      return;
    }
  }

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
      const methodCode = method.getFullText();

      if (
        !addNode(
          acc,
          {
            id: methodId,
            type: "method",
            label: methodName,
            filePath,
            code: methodCode,
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
        loaded: true,
      },
      maxNodes,
    );
  }

  if (acc.limitReached) return;

  const moduleFunctions: { name: string; code: string; id: string }[] = [];

  for (const func of sourceFile.getFunctions()) {
    if (acc.limitReached) break;
    const name = func.getName();
    if (!name) continue;
    moduleFunctions.push({
      name,
      code: func.getFullText(),
      id: functionNodeId(filePath, name),
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

export function parseFileGraph(
  filePath: string,
  maxNodes: number = MAX_FOCUS_NODES,
): FocusResult {
  const focusFile = path.normalize(path.resolve(filePath));

  if (!fs.existsSync(focusFile)) {
    throw new Error("File does not exist");
  }
  if (!fs.statSync(focusFile).isFile()) {
    throw new Error("Path must be a file");
  }
  if (!isTsFile(focusFile)) {
    throw new Error("File must be a .ts or .tsx file");
  }

  const acc = createAccumulator();
  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const sourceFile = project.addSourceFileAtPath(focusFile);

  parseFileInto(acc, focusFile, sourceFile, maxNodes, {
    compoundClasses: true,
    includeFileNode: false,
  });

  addClassImportEdges(acc, focusFile, sourceFile);
  addStructuralEdges(acc, focusFile, sourceFile);

  return {
    nodes: acc.nodes,
    edges: acc.edges,
    truncated: acc.truncated || undefined,
    focusFile,
  };
}

export function parseFocus(
  filePath: string,
  depth: number,
  maxNodes: number = MAX_FOCUS_NODES,
): FocusResult {
  const focusFile = path.normalize(path.resolve(filePath));

  if (!fs.existsSync(focusFile)) {
    throw new Error("File does not exist");
  }
  if (!fs.statSync(focusFile).isFile()) {
    throw new Error("Path must be a file");
  }
  if (!isTsFile(focusFile)) {
    throw new Error("File must be a .ts or .tsx file");
  }

  const clampedDepth = Math.max(1, Math.min(3, Math.floor(depth)));
  const filesToParse = collectFilesWithinDepth(focusFile, clampedDepth);

  const acc = createAccumulator();
  const project = new Project({ skipAddingFilesFromTsConfig: true });

  const sortedFiles = [...filesToParse].sort((a, b) => {
    if (a === focusFile) return -1;
    if (b === focusFile) return 1;
    return a.localeCompare(b);
  });

  for (const fp of sortedFiles) {
    if (acc.limitReached) break;
    if (!isTsFile(fp)) continue;

    const sourceFile = project.addSourceFileAtPath(fp);
    parseFileInto(acc, fp, sourceFile, maxNodes, {
      compoundClasses: true,
      includeFileNode: false,
    });
  }

  for (const fp of sortedFiles) {
    if (acc.limitReached) break;
    if (!isTsFile(fp)) continue;
    const sourceFile = project.getSourceFile(fp);
    if (!sourceFile) continue;
    addClassImportEdges(acc, fp, sourceFile);
    addStructuralEdges(acc, fp, sourceFile);
  }

  return {
    nodes: acc.nodes,
    edges: acc.edges,
    truncated: acc.truncated || undefined,
    focusFile,
  };
}
