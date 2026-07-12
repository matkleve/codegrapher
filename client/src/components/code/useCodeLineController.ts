import { useCodeLinePreview } from "@/components/code/useCodeLinePreview";
import { useCodeLineSimulation } from "@/components/code/useCodeLineSimulation";
import { useCodeLineTokens } from "@/components/code/useCodeLineTokens";
import type { CodeLineProps } from "@/components/code/codeLineTypes";

/**
 * Composes a code line's tokenization, trace/preview, and simulation state.
 * Keeps CodeLine.tsx a thin render file.
 */
export function useCodeLineController(props: CodeLineProps) {
  const { tokens, isLinkableIdentifier } = useCodeLineTokens(props);
  const preview = useCodeLinePreview({ ...props, tokens, isLinkableIdentifier });
  const simulation = useCodeLineSimulation(props);

  return { tokens, isLinkableIdentifier, ...preview, ...simulation };
}
