/** File-absolute last line of a method's `code` string. */
export function methodLastFileLine(methodStartLine: number, code: string): number {
  return methodStartLine + code.split("\n").length - 1;
}

type TraceAnchor = {
  memberId: string;
  methodStartLine: number;
  code: string;
  startLine: number;
};

type EndMarker = { memberId: string; line: number };

/** File-absolute effective end: explicit ■ or implicit method end. */
export function effectiveEndFileLine(
  anchor: TraceAnchor,
  endAnchor: EndMarker | null,
): number {
  if (endAnchor?.memberId === anchor.memberId) return endAnchor.line;
  return methodLastFileLine(anchor.methodStartLine, anchor.code);
}

export function isFileLineInTraceRange(
  anchor: TraceAnchor,
  endAnchor: EndMarker | null,
  memberId: string,
  lineNumber: number,
): boolean {
  if (anchor.memberId !== memberId) return false;
  const end = effectiveEndFileLine(anchor, endAnchor);
  return lineNumber >= anchor.startLine && lineNumber <= end;
}
