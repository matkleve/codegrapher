import { CodeLine } from "@/components/code/CodeLine";
import type { ControlFlowIndex } from "@/lib/controlFlowLinks";
import type { LexicalGraph } from "@/lib/lexicalGraph";
import type { MemberSymbolIndex } from "@/lib/localSymbolLinks";

type MemberRowBodyProps = {
  memberId: string;
  lines: string[];
  startLine: number;
  flowNodeId: string;
  graphNodeId: string;
  filePath: string;
  classLabel: string;
  symbolIndex: MemberSymbolIndex;
  lexicalGraph: LexicalGraph;
  controlFlowIndex: ControlFlowIndex;
  symbolName?: string;
  code: string;
  traceName: string;
  signatureLine: string;
};

export function MemberRowBody({
  memberId,
  lines,
  startLine,
  flowNodeId,
  graphNodeId,
  filePath,
  classLabel,
  symbolIndex,
  lexicalGraph,
  controlFlowIndex,
  symbolName,
  code,
  traceName,
  signatureLine,
}: MemberRowBodyProps) {
  return (
    <div className="member-body-wrap nodrag overflow-visible px-2 pb-2 pl-5 pt-1.5 text-muted-foreground">
      <div className="flex flex-col gap-0.5">
        {lines.map((line, i) => (
          <CodeLine
            key={`${memberId}-${i}`}
            line={line}
            lineNumber={startLine + i}
            memberId={memberId}
            sourceFlowId={flowNodeId}
            sourceGraphNodeId={graphNodeId}
            filePath={filePath}
            definedInLabel={classLabel}
            symbolIndex={symbolIndex}
            lexicalGraph={lexicalGraph}
            controlFlowIndex={controlFlowIndex}
            memberSymbolName={symbolName}
            methodCode={code}
            methodName={traceName}
            signatureLine={signatureLine}
            methodStartLine={startLine}
          />
        ))}
      </div>
    </div>
  );
}
