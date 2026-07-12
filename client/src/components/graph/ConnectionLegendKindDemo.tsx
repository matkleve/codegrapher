import { useRef, useState } from "react";
import { WireMarkerDefs } from "@/components/graph/WireMarkerDefs";
import { useLegendDemoWire } from "@/hooks/useLegendDemoWire";
import {
  legendSwatchClasses,
  wireStyleForKind,
  type LegendConnectionKind,
} from "@/lib/connectionWireStyle";
import {
  legendDemoNeedsTallCanvas,
  LEGEND_DEMO_SCENES,
  type DemoCodeLineScene,
  type DemoCodePart,
  type DemoMemberScene,
} from "@/lib/connectionLegendDemoScenes";
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
}: {
  id: string;
  label: string;
  tokenKind?: string;
  lit: boolean;
  onToggle: (id: string) => void;
  defLabel?: boolean;
}) {
  const Tag = defLabel ? "span" : "button";
  return (
    <Tag
      type={defLabel ? undefined : "button"}
      data-demo-anchor={id}
      data-token-kind={tokenKind}
      className={cn(
        defLabel ? "token-def-label" : "token-chip",
        "connection-legend-demo-anchor",
        lit && "connection-legend-demo-anchor--lit",
      )}
      onClick={
        defLabel
          ? undefined
          : (e) => {
              e.stopPropagation();
              onToggle(id);
            }
      }
    >
      <span className="token-chip-text">{label}</span>
    </Tag>
  );
}

function DemoCodePartSpan({ part }: { part: DemoCodePart }) {
  return (
    <span className={part.tone === "kw" ? "code-kw" : "code-pn"}>{part.text}</span>
  );
}

function DemoCodeLine({
  line,
  lineNo,
  litId,
  onToggle,
}: {
  line: DemoCodeLineScene;
  lineNo: number;
  litId: string | null;
  onToggle: (id: string) => void;
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
              tokenKind={part.tokenKind}
              lit={litId === part.anchorId}
              onToggle={onToggle}
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
}: {
  member: DemoMemberScene;
  litId: string | null;
  onToggle: (id: string) => void;
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
                  tokenKind={part.tokenKind}
                  lit={litId === part.anchorId}
                  onToggle={onToggle}
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
  const tallCanvas = legendDemoNeedsTallCanvas(scene);
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
        scene.layout === "split" && "connection-legend-demo--split",
        tallCanvas && "connection-legend-demo--tall",
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
