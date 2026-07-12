export type GutterAction = "start" | "end" | "pause";

export type LineMarker = { memberId: string; line: number };

export type GutterAnchorState = {
  start: { memberId: string; startLine: number } | null;
  end: LineMarker | null;
};

function hasExplicitEndOnMember(state: GutterAnchorState, memberId: string): boolean {
  return state.end?.memberId === memberId;
}

function isStrictlyBetween(
  line: number,
  startLine: number,
  endLine: number,
): boolean {
  const lo = Math.min(startLine, endLine);
  const hi = Math.max(startLine, endLine);
  return line > lo && line < hi;
}

/** Primary one-click action for the smart gutter path. */
export function gutterPrimaryAction(
  memberId: string,
  line: number,
  state: GutterAnchorState,
): GutterAction {
  const { start, end } = state;

  if (!start) return "start";
  if (start.memberId !== memberId) return "start";

  if (!hasExplicitEndOnMember(state, memberId)) {
    if (line === start.startLine) return "start";
    return "end";
  }

  const endLine = end!.line;
  if (line === start.startLine) return "start";
  if (line === endLine) return "end";

  return "pause";
}

/** Icon preview while hovering a line (pause hint strictly inside explicit range). */
export function gutterPreviewAction(
  memberId: string,
  line: number,
  state: GutterAnchorState,
): GutterAction {
  const { start, end } = state;
  if (
    start?.memberId === memberId &&
    hasExplicitEndOnMember(state, memberId) &&
    isStrictlyBetween(line, start.startLine, end!.line)
  ) {
    return "pause";
  }
  return gutterPrimaryAction(memberId, line, state);
}

/** Dropdown order — primary action first, then the other two. */
export function gutterMenuActions(primary: GutterAction): GutterAction[] {
  const rest: GutterAction[] = ["start", "end", "pause"].filter((a) => a !== primary);
  return [primary, ...rest];
}

export const GUTTER_ACTION_LABELS: Record<GutterAction, string> = {
  start: "Start here",
  end: "Stop here",
  pause: "Pause here",
};
