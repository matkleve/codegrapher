import { CodeLineControlFlowToken } from "@/components/code/CodeLineControlFlowToken";
import { CodeLineIdentifierToken } from "@/components/code/CodeLineIdentifierToken";
import { CodeLineImportToken } from "@/components/code/CodeLineImportToken";
import { CodeLinePlainSpan } from "@/components/code/CodeLinePlainSpan";
import { CodeLineTemplateLiteralSpan } from "@/components/code/CodeLineTemplateLiteralSpan";
import type { CodeLineTokenContext } from "@/components/code/codeLineTokenTypes";
import { controlFlowAnchorFor } from "@/lib/controlFlowLinks";
import { isImportModuleSpecifier } from "@/lib/importModuleTokens";

export function CodeLineTokenList(props: CodeLineTokenContext) {
  const { lineNumber, controlFlowIndex, controller } = props;
  const { tokens } = controller;

  return (
    <>
      {tokens.map((token, i) => {
        const renderProps = { ...props, token, tokenIndex: i };

        if (token.kind === "string" && isImportModuleSpecifier(tokens, i)) {
          return <CodeLineImportToken key={`${lineNumber}-${i}`} {...renderProps} />;
        }

        if (token.kind !== "identifier") {
          const cfAnchor = controlFlowAnchorFor(controlFlowIndex, lineNumber, i);
          if (cfAnchor && cfAnchor.role !== "condition") {
            const cfRole = cfAnchor.role === "head" ? "head" : "branch";
            return (
              <CodeLineControlFlowToken
                key={`${lineNumber}-${i}`}
                {...renderProps}
                cfRole={cfRole}
              />
            );
          }

          if (
            token.kind === "string" &&
            token.text.startsWith("`") &&
            token.text.includes("${")
          ) {
            return (
              <CodeLineTemplateLiteralSpan key={`${lineNumber}-${i}`} {...renderProps} />
            );
          }

          return <CodeLinePlainSpan key={`${lineNumber}-${i}`} {...renderProps} />;
        }

        const nonWsBefore = tokens.slice(0, i).filter((t) => t.kind !== "whitespace");
        const prevText = nonWsBefore.at(-1)?.text ?? null;
        const prevPrevText = nonWsBefore.at(-2)?.text ?? null;

        return (
          <CodeLineIdentifierToken
            key={`${lineNumber}-${i}`}
            {...renderProps}
            prevText={prevText}
            prevPrevText={prevPrevText}
          />
        );
      })}
    </>
  );
}
