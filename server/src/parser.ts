import { Project, Node, type SourceFile } from "ts-morph";
import * as fs from "fs";
import * as path from "path";

export const MAX_FOCUS_NODES = 50;

export interface GraphNode {
  id: string;
  type: "file" | "class" | "function" | "method";
  label: string;
  filePath: string;
  code: string;
  loaded?: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: "contains" | "imports" | "calls";
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
  const key = `${edge.source}|${edge.target}|${edge.type}`;
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

function addStubFileNode(acc: ParseAccumulator, filePath: string, maxNodes: number): string | null {
  const fileId = `file:${filePath}`;
  if (acc.nodeIds.has(fileId)) return fileId;

  const ok = addNode(
    acc,
    {
      id: fileId,
      type: "file",
      label: `+ ${path.basename(filePath)}`,
      filePath,
      code: "",
      loaded: false,
    },
    maxNodes,
  );
  return ok ? fileId : null;
}

function parseFileInto(
  acc: ParseAccumulator,
  filePath: string,
  sourceFile: SourceFile,
  maxNodes: number,
): void {
  const fileId = `file:${filePath}`;

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

  for (const classDecl of sourceFile.getClasses()) {
    if (acc.limitReached) break;

    const className = classDecl.getName() ?? "AnonymousClass";
    const classId = `class:${filePath}:${className}`;

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
    addEdge(acc, { source: fileId, target: classId, type: "contains" });

    for (const method of classDecl.getMethods()) {
      if (acc.limitReached) break;

      const methodName = method.getName();
      const methodId = `method:${filePath}:${className}.${methodName}`;

      if (
        !addNode(
          acc,
          {
            id: methodId,
            type: "method",
            label: methodName,
            filePath,
            code: method.getFullText(),
            loaded: true,
          },
          maxNodes,
        )
      ) {
        break;
      }
      addEdge(acc, { source: classId, target: methodId, type: "contains" });
    }
  }

  if (acc.limitReached) return;

  for (const func of sourceFile.getFunctions()) {
    if (acc.limitReached) break;

    const name = func.getName();
    if (!name) continue;

    const funcId = `function:${filePath}:${name}`;
    if (
      !addNode(
        acc,
        {
          id: funcId,
          type: "function",
          label: name,
          filePath,
          code: func.getFullText(),
          loaded: true,
        },
        maxNodes,
      )
    ) {
      break;
    }
    addEdge(acc, { source: fileId, target: funcId, type: "contains" });
  }

  if (acc.limitReached) return;

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
    const funcId = `function:${filePath}:${name}`;
    if (
      !addNode(
        acc,
        {
          id: funcId,
          type: "function",
          label: name,
          filePath,
          code: varDecl.getFullText(),
          loaded: true,
        },
        maxNodes,
      )
    ) {
      break;
    }
    addEdge(acc, { source: fileId, target: funcId, type: "contains" });
  }
}

function addImportEdges(
  acc: ParseAccumulator,
  filePath: string,
  sourceFile: SourceFile,
  parsedFiles: Set<string>,
  maxNodes: number,
): void {
  const fileId = `file:${filePath}`;
  if (!acc.nodeIds.has(fileId)) return;

  for (const importDecl of sourceFile.getImportDeclarations()) {
    if (acc.limitReached) break;

    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    if (!moduleSpecifier.startsWith(".")) continue;

    const resolved = resolveImportPath(filePath, moduleSpecifier);
    if (!resolved) continue;

    let targetId: string | null = `file:${resolved}`;

    if (!parsedFiles.has(resolved)) {
      targetId = addStubFileNode(acc, resolved, maxNodes);
    } else if (!acc.nodeIds.has(targetId)) {
      targetId = addStubFileNode(acc, resolved, maxNodes);
    }

    if (targetId) {
      addEdge(acc, { source: fileId, target: targetId, type: "imports" });
    }
  }
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

  const clampedDepth = Math.max(0, Math.min(10, Math.floor(depth)));
  const filesToParse = collectFilesWithinDepth(focusFile, clampedDepth);

  const acc = createAccumulator();
  const project = new Project({ skipAddingFilesFromTsConfig: true });

  const sortedFiles = [...filesToParse].sort((a, b) => {
    if (a === focusFile) return -1;
    if (b === focusFile) return 1;
    return a.localeCompare(b);
  });

  const parsedFiles = new Set<string>();

  for (const fp of sortedFiles) {
    if (acc.limitReached) break;
    if (!isTsFile(fp)) continue;

    const sourceFile = project.addSourceFileAtPath(fp);
    parseFileInto(acc, fp, sourceFile, maxNodes);
    parsedFiles.add(fp);
  }

  for (const fp of parsedFiles) {
    if (acc.limitReached) break;
    const sourceFile = project.getSourceFile(fp);
    if (!sourceFile) continue;
    addImportEdges(acc, fp, sourceFile, parsedFiles, maxNodes);
  }

  return {
    nodes: acc.nodes,
    edges: acc.edges,
    truncated: acc.truncated || undefined,
    focusFile,
  };
}
