const traceKeys = new Map<string, HTMLElement>();
const localDefIds = new Map<string, HTMLElement>();
const localTargetIds = new Map<string, HTMLElement>();
const handles = new Map<string, HTMLElement>();
const memberIds = new Map<string, HTMLElement>();

function handleKey(targetId: string, side: "left" | "right"): string {
  return `${targetId}::${side}`;
}

/** Register a trace host element by its data-* identity attributes. */
export function registerTraceHost(el: HTMLElement): void {
  const traceKey = el.dataset.traceKey;
  if (traceKey) traceKeys.set(traceKey, el);

  const defId = el.dataset.localDefId;
  if (defId) localDefIds.set(defId, el);

  const targetId = el.dataset.localTargetId;
  if (targetId) localTargetIds.set(targetId, el);

  const memberId = el.dataset.memberId;
  if (memberId) {
    memberIds.set(memberId, el);
  }
}

/** Register a FlowAnchor dot for handle-based wire endpoints. */
export function registerFlowAnchor(el: HTMLElement): void {
  const targetId = el.dataset.flowAnchorTarget;
  const side = el.dataset.flowAnchor as "left" | "right" | undefined;
  if (targetId && side) {
    handles.set(handleKey(targetId, side), el);
  }
}

export function unregisterElement(el: HTMLElement): void {
  for (const [key, host] of traceKeys) {
    if (host === el) traceKeys.delete(key);
  }
  for (const [key, host] of localDefIds) {
    if (host === el) localDefIds.delete(key);
  }
  for (const [key, host] of localTargetIds) {
    if (host === el) localTargetIds.delete(key);
  }
  for (const [key, host] of handles) {
    if (host === el) handles.delete(key);
  }
  for (const [key, host] of memberIds) {
    if (host === el) memberIds.delete(key);
  }
}

export function getByTraceKey(key: string): HTMLElement | null {
  const el = traceKeys.get(key);
  return el?.isConnected ? el : null;
}

export function getByLocalDefId(id: string): HTMLElement | null {
  const el = localDefIds.get(id);
  return el?.isConnected ? el : null;
}

export function getByLocalTargetId(id: string): HTMLElement | null {
  const el = localTargetIds.get(id);
  return el?.isConnected ? el : null;
}

export function getByHandle(targetId: string, side: "left" | "right"): HTMLElement | null {
  const el = handles.get(handleKey(targetId, side));
  return el?.isConnected ? el : null;
}

export function getByMemberId(memberId: string): HTMLElement | null {
  const el = memberIds.get(memberId);
  return el?.isConnected ? el : null;
}

export function clearElementRegistry(): void {
  traceKeys.clear();
  localDefIds.clear();
  localTargetIds.clear();
  handles.clear();
  memberIds.clear();
}
