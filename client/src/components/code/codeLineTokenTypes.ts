import type { useCodeLineController } from "@/components/code/useCodeLineController";
import type { CodeLineProps } from "@/components/code/codeLineTypes";

export type CodeLineController = ReturnType<typeof useCodeLineController>;

export type CodeLineTokenContext = CodeLineProps & {
  controller: CodeLineController;
};

export type CodeLineTokenRenderProps = CodeLineTokenContext & {
  tokenIndex: number;
};
