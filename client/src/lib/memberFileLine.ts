/** 1-based file line for a snippet line index (0-based). */
export function fileLineFromSnippetIndex(
  startLine: number,
  lineIndex: number,
): number {
  return startLine + lineIndex;
}
