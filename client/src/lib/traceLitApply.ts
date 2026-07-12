import { tracePathOpacity } from "@/lib/traceDepth";
import { TOKEN_ANCHOR, type SemanticTokenKind } from "@/lib/tokenColors";

export const CHIP_LIT = "token-chip-lit";
export const CHIP_ON = "token-chip-on";
export const CHIP_SOURCE = "token-chip-source";
export const CHIP_HOVER_PREVIEW = "token-chip-hover-preview";
export const MEMBER_LIT = "trace-member-lit";
export const MEMBER_OWNER_LIT = "trace-member-owner-lit";
export const LINE_LIT = "trace-lit-line";
export const TRACE_DEPTH_FADED = "trace-depth-faded";
export const ANCHOR_ON = "flow-anchor-on";
export const ANCHOR_OFF = "flow-anchor-off";
export const ANCHOR_ENDPOINT_SIBLING = "flow-anchor-endpoint-sibling";

export type SocketState = {
  endpointSibling: boolean;
  depth: number;
  colorClasses: string[];
};

export type HostState = {
  classes: string[];
  depth: number;
  sockets: Map<HTMLElement, SocketState>;
};

const appliedHosts = new Map<HTMLElement, HostState>();
const appliedSockets = new Map<HTMLElement, SocketState>();

export function anchorColorClasses(host: HTMLElement): string[] {
  if (host.dataset.controlFlowRole) {
    return ["bg-[color:var(--edge-control-flow)]", "text-[color:var(--edge-control-flow)]"];
  }
  const kind = host.dataset.tokenKind as SemanticTokenKind | undefined;
  if (kind && kind in TOKEN_ANCHOR) {
    return TOKEN_ANCHOR[kind].split(/\s+/).filter(Boolean);
  }
  return ["bg-border"];
}

function removeAnchorColorClasses(anchor: HTMLElement): void {
  for (const color of Object.values(TOKEN_ANCHOR)) {
    for (const cls of color.split(/\s+/)) {
      anchor.classList.remove(cls);
    }
  }
}

function applyDepth(el: HTMLElement, depth: number): void {
  if (depth <= 1) {
    el.classList.remove(TRACE_DEPTH_FADED);
    el.style.removeProperty("opacity");
    return;
  }
  el.classList.add(TRACE_DEPTH_FADED);
  el.style.opacity = String(tracePathOpacity(depth));
}

function revertDepth(el: HTMLElement): void {
  el.classList.remove(TRACE_DEPTH_FADED);
  el.style.removeProperty("opacity");
}

function classesEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((c) => setB.has(c));
}

function socketStatesEqual(a: SocketState, b: SocketState): boolean {
  return (
    a.endpointSibling === b.endpointSibling &&
    a.depth === b.depth &&
    classesEqual(a.colorClasses, b.colorClasses)
  );
}

function revertSocket(el: HTMLElement): void {
  el.classList.remove(ANCHOR_ON, ANCHOR_ENDPOINT_SIBLING, TRACE_DEPTH_FADED);
  el.classList.add(ANCHOR_OFF, "bg-border");
  removeAnchorColorClasses(el);
  el.style.removeProperty("opacity");
  appliedSockets.delete(el);
}

function applySocket(el: HTMLElement, state: SocketState): void {
  el.classList.remove(ANCHOR_OFF, ANCHOR_ENDPOINT_SIBLING);
  el.classList.add(ANCHOR_ON);
  removeAnchorColorClasses(el);
  el.classList.add(...state.colorClasses);
  el.classList.toggle(ANCHOR_ENDPOINT_SIBLING, state.endpointSibling);
  applyDepth(el, state.depth);
  appliedSockets.set(el, state);
}

function revertHost(el: HTMLElement, state: HostState): void {
  for (const cls of state.classes) {
    el.classList.remove(cls);
  }
  revertDepth(el);
  for (const socket of state.sockets.keys()) {
    revertSocket(socket);
  }
  appliedHosts.delete(el);
}

function applyHost(el: HTMLElement, state: HostState): void {
  for (const cls of state.classes) {
    if (!el.classList.contains(cls)) el.classList.add(cls);
  }
  applyDepth(el, state.depth);
  for (const [socket, socketState] of state.sockets) {
    applySocket(socket, socketState);
  }
  appliedHosts.set(el, state);
}

/** Patch DOM to match desired lit state — only touches changed elements. */
export function syncTraceLitDom(next: Map<HTMLElement, HostState>): void {
  for (const [el, prev] of appliedHosts) {
    if (!next.has(el)) revertHost(el, prev);
  }

  for (const [el, state] of next) {
    const prev = appliedHosts.get(el);
    if (
      prev &&
      classesEqual(prev.classes, state.classes) &&
      prev.depth === state.depth
    ) {
      const socketKeys = [...state.sockets.keys()];
      const sameSockets =
        socketKeys.length === prev.sockets.size &&
        socketKeys.every((socket) => {
          const a = prev.sockets.get(socket);
          const b = state.sockets.get(socket);
          return a != null && b != null && socketStatesEqual(a, b);
        });
      if (sameSockets) continue;
    }
    if (prev) revertHost(el, prev);
    applyHost(el, state);
  }

  for (const [socket] of appliedSockets) {
    let stillManaged = false;
    for (const state of next.values()) {
      if (state.sockets.has(socket)) {
        stillManaged = true;
        break;
      }
    }
    if (!stillManaged) revertSocket(socket);
  }
}

export function clearTraceLitDom(): void {
  for (const [el, state] of [...appliedHosts]) {
    if (el.isConnected) revertHost(el, state);
    else appliedHosts.delete(el);
  }
  appliedHosts.clear();
  appliedSockets.clear();
}

export function createHostState(classes: string[], depth: number): HostState {
  return { classes, depth, sockets: new Map() };
}

export function addSocketState(
  host: HostState,
  socket: HTMLElement,
  state: SocketState,
): void {
  host.sockets.set(socket, state);
}
