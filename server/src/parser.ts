import { Project, Node } from "ts-morph";
import * as fs from "fs";
import * as path from "path";

export interface GraphNode {
  id: string;
  type: "file" | "class" | "function" | "method";
  label: string;
  filePath: string;
  code: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: "contains" | "imports" | "calls";
}

export interface ParseResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  truncated?: boolean;
}

export interface ParseProgressUpdate {
  phase: "scanning" | "parsing" | "building";
  message: string;
  nodeCount: number;
}

export interface ParseOptions {
  maxNodes?: number;
  onProgress?: (update: ParseProgressUpdate) => void;
  shouldContinue?: () => boolean;
}

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next"]);

function getAllTsFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        results.push(...getAllTsFiles(fullPath));
      }
    } else if (/\.tsx?$/.test(entry.name)) {
      results.push(path.normalize(fullPath));
    }
  }
  return results;
}

function resolveImportPath(fromFile: string, moduleSpecifier: string): string | null {
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

export function parseDirectory(rootPath: string, options: ParseOptions = {}): ParseResult {
  const { maxNodes, onProgress, shouldContinue = () => true } = options;
  const normalizedRoot = path.normalize(rootPath);

  onProgress?.({
    phase: "scanning",
    message: "Parsing files...",
    nodeCount: 0,
  });

  const filePaths = getAllTsFiles(normalizedRoot);
  const filePathSet = new Set(filePaths);
  const filesTotal = filePaths.length;

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeIds = new Set<string>();
  let limitReached = false;
  let truncated = false;

  const project = new Project({ skipAddingFilesFromTsConfig: true });

  const reportProgress = (filesProcessed: number) => {
    onProgress?.({
      phase: "parsing",
      message: "Parsing files...",
      nodeCount: nodes.length,
    });
    if (filesProcessed === filesTotal && filesTotal > 0) {
      onProgress?.({
        phase: "building",
        message: `Building graph (${nodes.length} nodes)...`,
        nodeCount: nodes.length,
      });
    }
  };

  const addNode = (node: GraphNode): boolean => {
    if (nodeIds.has(node.id)) return true;
    if (maxNodes !== undefined && nodes.length >= maxNodes) {
      limitReached = true;
      truncated = true;
      return false;
    }
    nodeIds.add(node.id);
    nodes.push(node);
    return true;
  };

  const addEdge = (edge: GraphEdge) => {
    edges.push(edge);
  };

  for (let fileIndex = 0; fileIndex < filePaths.length; fileIndex++) {
    if (!shouldContinue() || limitReached) break;

    const filePath = filePaths[fileIndex];
    const sourceFile = project.addSourceFileAtPath(filePath);
    const fileId = `file:${filePath}`;

    if (!addNode({
      id: fileId,
      type: "file",
      label: path.basename(filePath),
      filePath,
      code: sourceFile.getFullText(),
    })) {
      break;
    }

    for (const classDecl of sourceFile.getClasses()) {
      if (!shouldContinue() || limitReached) break;

      const className = classDecl.getName() ?? "AnonymousClass";
      const classId = `class:${filePath}:${className}`;

      if (
        !addNode({
          id: classId,
          type: "class",
          label: className,
          filePath,
          code: classDecl.getFullText(),
        })
      ) {
        break;
      }
      addEdge({ source: fileId, target: classId, type: "contains" });

      for (const method of classDecl.getMethods()) {
        if (!shouldContinue() || limitReached) break;

        const methodName = method.getName();
        const methodId = `method:${filePath}:${className}.${methodName}`;

        if (
          !addNode({
            id: methodId,
            type: "method",
            label: methodName,
            filePath,
            code: method.getFullText(),
          })
        ) {
          break;
        }
        addEdge({ source: classId, target: methodId, type: "contains" });
      }
    }

    if (limitReached) break;

    for (const func of sourceFile.getFunctions()) {
      if (!shouldContinue() || limitReached) break;

      const name = func.getName();
      if (!name) continue;

      const funcId = `function:${filePath}:${name}`;
      if (
        !addNode({
          id: funcId,
          type: "function",
          label: name,
          filePath,
          code: func.getFullText(),
        })
      ) {
        break;
      }
      addEdge({ source: fileId, target: funcId, type: "contains" });
    }

    if (limitReached) break;

    for (const varDecl of sourceFile.getVariableDeclarations()) {
      if (!shouldContinue() || limitReached) break;

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
        !addNode({
          id: funcId,
          type: "function",
          label: name,
          filePath,
          code: varDecl.getFullText(),
        })
      ) {
        break;
      }
      addEdge({ source: fileId, target: funcId, type: "contains" });
    }

    if (limitReached) break;

    for (const importDecl of sourceFile.getImportDeclarations()) {
      if (!shouldContinue() || limitReached) break;

      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      if (!moduleSpecifier.startsWith(".")) continue;

      const resolved = resolveImportPath(filePath, moduleSpecifier);
      if (resolved && filePathSet.has(resolved)) {
        addEdge({
          source: fileId,
          target: `file:${resolved}`,
          type: "imports",
        });
      }
    }

    reportProgress(fileIndex + 1);
  }

  onProgress?.({
    phase: "building",
    message: `Building graph (${nodes.length} nodes)...`,
    nodeCount: nodes.length,
  });

  return { nodes, edges, truncated: truncated || undefined };
}
