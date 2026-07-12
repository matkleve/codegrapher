export {
  BACKWARD_LEXICAL_MAX_DEPTH,
  RELATIVE_FAN_OUT_CAP,
  RELATIVE_MAX_DEPTH,
  TRACE_DEPTH_DOWN,
  TRACE_DEPTH_UP,
  buildLexicalGraph,
  siteKey,
  tokenAtSite,
  type LexicalEdgeKind,
  type LexicalGraph,
  type LexicalHopEndpoint,
  type LexicalSite,
  type LexicalWalkHop,
  type MemberPropRoute,
} from "@/lib/lexicalWalkCore";

export { walkLexicalForward, type WalkLexicalOptions } from "@/lib/lexicalWalkForward";

export {
  walkLexicalBackward,
  type WalkLexicalBackwardOptions,
} from "@/lib/lexicalWalkBackward";
