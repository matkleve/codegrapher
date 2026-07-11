import { Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimStepTickStrip } from "@/components/simulation/SimStepTickStrip";
import { useSimulation } from "@/context/SimulationContext";
import type { PlaybackSpeed } from "@/lib/staticWalk/types";

const SPEEDS: PlaybackSpeed[] = [0.5, 1, 2, 4];

export function SimulationToolbar() {
  const {
    simActive,
    session,
    playing,
    playbackSpeed,
    setPlaybackSpeed,
    stepBack,
    stepForward,
    togglePlay,
    scrubTo,
    exitSimulation,
  } = useSimulation();

  if (!simActive || !session) return null;

  return (
    <div className="pointer-events-auto absolute bottom-14 left-1/2 z-50 flex max-w-[min(96vw,720px)] -translate-x-1/2 items-center gap-2 rounded-lg border border-brand-border bg-card/95 px-3 py-2 shadow-md backdrop-blur-sm">
      <Button type="button" variant="ghost" size="icon-sm" onClick={stepBack} aria-label="Step back">
        <SkipBack />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={togglePlay}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause /> : <Play />}
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" onClick={stepForward} aria-label="Step forward">
        <SkipForward />
      </Button>
      <SimStepTickStrip
        steps={session.steps}
        currentIndex={session.currentIndex}
        onSelect={scrubTo}
      />
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {session.currentIndex + 1}/{session.steps.length}
      </span>
      <select
        value={playbackSpeed}
        onChange={(e) => setPlaybackSpeed(Number(e.target.value) as PlaybackSpeed)}
        className="shrink-0 rounded border border-border bg-background px-1.5 py-0.5 text-xs"
        aria-label="Playback speed"
      >
        {SPEEDS.map((s) => (
          <option key={s} value={s}>
            {s}×
          </option>
        ))}
      </select>
      <Button type="button" variant="ghost" size="icon-sm" onClick={exitSimulation} aria-label="Exit simulation">
        <X />
      </Button>
    </div>
  );
}
