import { useMemo, useRef, useState } from "react";
import { ConnectorChip } from "@/components/code/ConnectorChip";
import { FlowAnchor } from "@/components/code/FlowAnchor";
import { WireMarkerDefs } from "@/components/graph/WireMarkerDefs";
import { useLegendDemoWire } from "@/hooks/useLegendDemoWire";
import {
  legendSwatchClasses,
  wireStyleForKind,
  type LegendConnectionKind,
} from "@/lib/connectionWireStyle";
import {
  demoAnchorSockets,
  LEGEND_DEMO_SCENES,
  type DemoCodeLineScene,
  type DemoCodePart,
  type DemoMemberScene,
} from "@/lib/connectionLegendDemoScenes";
import { TOKEN_ANCHOR, type SemanticTokenKind } from "@/lib/tokenColors";
import { cn } from "@/lib/utils";

type ConnectionLegendKindDemoProps = {
  kind: LegendConnectionKind;
  active: boolean;
};

function DemoAnchorChip({
  id,
  label,
  tokenKind = "function",
  lit,
  onToggle,
  defLabel = false,
  signature = false,
  showLeftSocket = false,
  showRightSocket = false,
}: {
  id: string;
  label: string;
  tokenKind?: SemanticTokenKind;
  lit: boolean;
  onToggle: (id: string) => void;
  defLabel?: boolean;
  signature?: boolean;
  showLeftSocket?: boolean;
  showRightSocket?: boolean;
}) {
  const anchorColor = TOKEN_ANCHOR[tokenKind];

  if (defLabel) {
    return (
      <span
        data-demo-anchor={id}
        data-token-kind={tokenKind}
        className={cn(
          "token-def-label relative token-chip-on",
          "connection-legend-demo-anchor",
          lit && "connection-legend-demo-anchor--lit",
        )}
      >
        <FlowAnchor
          side="left"
          colorClass={anchorColor}
          visible={showLeftSocket}
          highlighted={showLeftSocket}
          size="chip"
        />
        <FlowAnchor
          side="right"
          colorClass={anchorColor}
          visible={showRightSocket}
          highlighted={showRightSocket}
          size="chip"
        />
        <span className="token-shimmer-target">{label}</span>
      </span>
    );
  }

  return (
    <ConnectorChip
      label={label}
      kind={tokenKind}
      active
      showLeftSocket={showLeftSocket}
      showRightSocket={showRightSocket}
      data-demo-anchor={id}
      className={cn(
        "connection-legend-demo-anchor",
        signature &&
          (tokenKind === "type" ? "member-sig-type-chip" : "member-sig-token-chip"),
        lit && "connection-legend-demo-anchor--lit",
      )}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(id);
      }}
    />
  );
}

function DemoCodePartSpan({ part }: { part: DemoCodePart }) {
  return (
    <span className={part.tone === "kw" ? "code-kw" : "code-pn"}>{part.text}</span>
  );
}

type AnchorSockets = Map<string, { left: boolean; right: boolean }>;

function socketFlags(id: string, anchorSockets: AnchorSockets) {
  const sockets = anchorSockets.get(id);
  return {
    showLeftSocket: sockets?.left ?? false,
    showRightSocket: sockets?.right ?? false,
  };
}

function DemoCodeLine({
  line,
  lineNo,
  litId,
  onToggle,
  anchorSockets,
}: {
  line: DemoCodeLineScene;
  lineNo: number;
  litId: string | null;
  onToggle: (id: string) => void;
  anchorSockets: AnchorSockets;
}) {
  return (
    <div className="code-line connection-legend-demo-code-line">
      <span className="code-line-gutter" aria-hidden>
        {line.lineNo ?? lineNo}
      </span>
      <span className="code-line-body">
        {line.parts.map((part, i) =>
          part.anchorId ? (
            <DemoAnchorChip
              key={`${part.anchorId}-${i}`}
              id={part.anchorId}
              label={part.text}
              tokenKind={(part.tokenKind as SemanticTokenKind) ?? "variable"}
              lit={litId === part.anchorId}
              onToggle={onToggle}
              {...socketFlags(part.anchorId, anchorSockets)}
            />
          ) : (
            <DemoCodePartSpan key={`${part.text}-${i}`} part={part} />
          ),
        )}
      </span>
    </div>
  );
}

function DemoMember({
  member,
  litId,
  onToggle,
  anchorSockets,
}: {
  member: DemoMemberScene;
  litId: string | null;
  onToggle: (id: string) => void;
  anchorSockets: AnchorSockets;
}) {
  const expanded = Boolean(member.body?.length || member.signature?.length);
  const signatureOnly = Boolean(member.signature?.length && !member.body?.length);

  return (
    <div className={cn("member-row rounded-md bg-muted", expanded && "member-row--open")}>
      <div
        className={cn(
          "member-row-header connection-legend-demo-member-header flex w-full border border-transparent text-left",
          signatureOnly
            ? "flex-col items-start gap-y-0.5 py-1.5"
            : "flex-wrap items-center gap-x-1.5 gap-y-0.5 py-1",
        )}
      >
        {member.labelAnchorId ? (
          <DemoAnchorChip
            id={member.labelAnchorId}
            label={member.label}
            tokenKind={member.labelTokenKind}
            lit={litId === member.labelAnchorId}
            onToggle={onToggle}
            defLabel
            {...socketFlags(member.labelAnchorId, anchorSockets)}
          />
        ) : (
          <span
            className="member-row-label token-def-label shrink-0"
            data-token-kind={member.labelTokenKind ?? "function"}
          >
            {member.label}
          </span>
        )}
        {member.signature?.length ? (
          <span
            className={cn(
              "member-signature-tags connection-legend-demo-signature",
              signatureOnly && "connection-legend-demo-signature--stacked",
            )}
          >
            {member.signature.map((part, i) =>
              part.anchorId ? (
                <DemoAnchorChip
                  key={`${part.anchorId}-${i}`}
                  id={part.anchorId}
                  label={part.text}
                  tokenKind={(part.tokenKind as SemanticTokenKind) ?? "variable"}
                  lit={litId === part.anchorId}
                  onToggle={onToggle}
                  signature
                  {...socketFlags(part.anchorId, anchorSockets)}
                />
              ) : (
                <DemoCodePartSpan key={`${part.text}-${i}`} part={part} />
              ),
            )}
          </span>
        ) : null}
      </div>
      {expanded && member.body?.length ? (
        <div className="member-body-wrap connection-legend-demo-member-body">
          {member.body.map((line, i) => (
            <DemoCodeLine
              key={`${member.id}-line-${i}`}
              line={line}
              lineNo={i + 1}
              litId={litId}
              onToggle={onToggle}
              anchorSockets={anchorSockets}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ConnectionLegendKindDemo({
  kind,
  active,
}: ConnectionLegendKindDemoProps) {
  const [litId, setLitId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const def = wireStyleForKind(kind);
  const scene = LEGEND_DEMO_SCENES[kind];
  const anchorSockets = useMemo(() => demoAnchorSockets(scene.wire), [scene.wire]);
  const pathClass = legendSwatchClasses(kind, { pulse: false }).join(" ");
  const wire = useLegendDemoWire(rootRef, svgRef, scene.wire, kind);

  const onToggle = (id: string) => {
    setLitId((prev) => (prev === id ? null : id));
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        "connection-legend-demo canvas-dot-grid",
        !active && "connection-legend-demo--inactive",
      )}
      aria-hidden
    >
      <div
        className={cn(
          "connection-legend-demo-stage",
          scene.layout === "split"
            ? "connection-legend-demo-stage--split"
            : "connection-legend-demo-stage--solo",
        )}
      >
        {scene.cards.map((card) => (
          <div
            key={card.id}
            className={cn(
              "connection-legend-demo-card class-node-root",
              `connection-legend-demo-card--${card.variant}`,
            )}
          >
            <div className="node-card-header connection-legend-demo-card-header">
              {card.titleAnchorId ? (
                <DemoAnchorChip
                  id={card.titleAnchorId}
                  label={card.title}
                  tokenKind="class"
                  lit={litId === card.titleAnchorId}
                  onToggle={onToggle}
                  defLabel
                  {...socketFlags(card.titleAnchorId, anchorSockets)}
                />
              ) : (
                <span className="node-card-title">{card.title}</span>
              )}
            </div>
            <div className="connection-legend-demo-card-body">
              {card.members.map((member) => (
                <DemoMember
                  key={member.id}
                  member={member}
                  litId={litId}
                  onToggle={onToggle}
                  anchorSockets={anchorSockets}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <svg ref={svgRef} className="connection-legend-demo-svg" aria-hidden>
        <defs>
          <WireMarkerDefs />
        </defs>
        {wire.paths.map((pathD, i) => (
          <path
            key={`${kind}-wire-${i}`}
            d={pathD}
            fill="none"
            className={cn("connection-legend-demo-wire", pathClass)}
            stroke={def.stroke}
            markerEnd={`url(#${def.markerId})`}
            markerStart={
              kind === "typesetting" && i === 0 && def.markerStartId
                ? `url(#${def.markerStartId})`
                : undefined
            }
          />
        ))}
        {wire.junction ? (
          <circle
            cx={wire.junction.x}
            cy={wire.junction.y}
            r={3}
            className="preview-edge-junction"
            fill={def.stroke}
          />
        ) : null}
      </svg>
    </div>
  );
}
