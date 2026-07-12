import {
  Node,
  SyntaxKind,
  type ArrowFunction,
  type ClassDeclaration,
  type FunctionDeclaration,
  type FunctionExpression,
  type MethodDeclaration,
  type SourceFile,
} from "ts-morph";
import { classNodeId, functionNodeId, methodNodeId } from "./parseTypes";
import type { SymbolEntry } from "./indexerTypes";
import { addSymbol, isExportedDeclaration } from "./indexerUtils";

type FunctionLikeNode =
  | MethodDeclaration
  | FunctionDeclaration
  | ArrowFunction
  | FunctionExpression;

function hasInjectableDecorator(cls: ClassDeclaration): boolean {
  return cls.getDecorators().some((d) => {
    const name = d.getExpression().getText();
    return name === "Injectable" || name.endsWith(".Injectable");
  });
}

/** Simple identifier-named params/locals only — destructured bindings are skipped. */
export function indexParamsAndLocals(
  index: Map<string, SymbolEntry[]>,
  filePath: string,
  enclosingSymbol: string | undefined,
  fn: FunctionLikeNode,
): void {
  if (!enclosingSymbol) return;

  for (const param of fn.getParameters()) {
    const nameNode = param.getNameNode();
    if (!Node.isIdentifier(nameNode)) continue;
    addSymbol(index, nameNode.getText(), filePath, "param", param.getStartLineNumber(), enclosingSymbol);
  }

  for (const varDecl of fn.getDescendantsOfKind(SyntaxKind.VariableDeclaration)) {
    const owningFn = varDecl.getFirstAncestor((a) => Node.isFunctionLikeDeclaration(a));
    if (owningFn !== fn) continue;

    const nameNode = varDecl.getNameNode();
    if (!Node.isIdentifier(nameNode)) continue;
    addSymbol(index, nameNode.getText(), filePath, "local", varDecl.getStartLineNumber(), enclosingSymbol);
  }
}

export function indexClassesInFile(
  sf: SourceFile,
  index: Map<string, SymbolEntry[]>,
): void {
  const filePath = sf.getFilePath();

  for (const cls of sf.getClasses()) {
    const name = cls.getName();
    const line = cls.getStartLineNumber();
    const exported = isExportedDeclaration(cls);
    const injectable = hasInjectableDecorator(cls);

    if (exported || injectable) {
      addSymbol(index, name, filePath, "class", line);
    }

    if (exported || injectable) {
      const classId = name ? classNodeId(filePath, name) : undefined;

      for (const method of cls.getMethods()) {
        const methodName = method.getName();
        addSymbol(index, methodName, filePath, "method", method.getStartLineNumber(), classId);
        const methodId = classId && name ? methodNodeId(filePath, name, methodName) : undefined;
        indexParamsAndLocals(index, filePath, methodId, method);
      }
      for (const prop of cls.getProperties()) {
        addSymbol(index, prop.getName(), filePath, "property", prop.getStartLineNumber(), classId);
      }
    }
  }
}

export function indexExportedArrowFunctions(
  sf: SourceFile,
  index: Map<string, SymbolEntry[]>,
): void {
  const filePath = sf.getFilePath();

  for (const varDecl of sf.getVariableDeclarations()) {
    const parent = varDecl.getParent();
    if (parent?.getKind() !== SyntaxKind.VariableStatement) continue;
    const stmt = parent.asKindOrThrow(SyntaxKind.VariableStatement);
    if (!isExportedDeclaration(stmt)) continue;

    const init = varDecl.getInitializer();
    if (!init) continue;
    const initKind = init.getKind();
    const isFn =
      initKind === SyntaxKind.ArrowFunction ||
      initKind === SyntaxKind.FunctionExpression;
    if (!isFn) continue;

    const name = varDecl.getName();
    addSymbol(index, name, filePath, "function", varDecl.getStartLineNumber());
    indexParamsAndLocals(
      index,
      filePath,
      functionNodeId(filePath, name),
      init as ArrowFunction | FunctionExpression,
    );
  }
}
