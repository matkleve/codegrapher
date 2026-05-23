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

export function parseDirectory(rootPath: string): ParseResult {
  const normalizedRoot = path.normalize(rootPath);
  const filePaths = getAllTsFiles(normalizedRoot);
  const filePathSet = new Set(filePaths);

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeIds = new Set<string>();

  const project = new Project({ skipAddingFilesFromTsConfig: true });

  const addNode = (node: GraphNode) => {
    if (nodeIds.has(node.id)) return;
    nodeIds.add(node.id);
    nodes.push(node);
  };

  const addEdge = (edge: GraphEdge) => {
    edges.push(edge);
  };

  for (const filePath of filePaths) {
    const sourceFile = project.addSourceFileAtPath(filePath);
    const fileId = `file:${filePath}`;

    addNode({
      id: fileId,
      type: "file",
      label: path.basename(filePath),
      filePath,
      code: sourceFile.getFullText(),
    });

    for (const classDecl of sourceFile.getClasses()) {
      const className = classDecl.getName() ?? "AnonymousClass";
      const classId = `class:${filePath}:${className}`;

      addNode({
        id: classId,
        type: "class",
        label: className,
        filePath,
        code: classDecl.getFullText(),
      });
      addEdge({ source: fileId, target: classId, type: "contains" });

      for (const method of classDecl.getMethods()) {
        const methodName = method.getName();
        const methodId = `method:${filePath}:${className}.${methodName}`;

        addNode({
          id: methodId,
          type: "method",
          label: methodName,
          filePath,
          code: method.getFullText(),
        });
        addEdge({ source: classId, target: methodId, type: "contains" });
      }
    }

    for (const func of sourceFile.getFunctions()) {
      const name = func.getName();
      if (!name) continue;

      const funcId = `function:${filePath}:${name}`;
      addNode({
        id: funcId,
        type: "function",
        label: name,
        filePath,
        code: func.getFullText(),
      });
      addEdge({ source: fileId, target: funcId, type: "contains" });
    }

    for (const varDecl of sourceFile.getVariableDeclarations()) {
      const initializer = varDecl.getInitializer();
      if (
        !initializer ||
        (!Node.isArrowFunction(initializer) && !Node.isFunctionExpression(initializer))
      ) {
        continue;
      }

      const name = varDecl.getName();
      const funcId = `function:${filePath}:${name}`;
      addNode({
        id: funcId,
        type: "function",
        label: name,
        filePath,
        code: varDecl.getFullText(),
      });
      addEdge({ source: fileId, target: funcId, type: "contains" });
    }

    for (const importDecl of sourceFile.getImportDeclarations()) {
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
  }

  return { nodes, edges };
}
