import { useCallback, useEffect, useRef } from "react";
import type { PlaybackSpeed, SimSession } from "@/lib/staticWalk/types";
import type { LineAnchor } from "@/context/simulationTypes";

const PLAY_INTERVAL_MS = 600;

type TransportArgs = {
  session: SimSession | null;
  playing: boolean;
  playbackSpeed: PlaybackSpeed;
  pauseAnchors: LineAnchor[];
  setPlaying: (playing: boolean | ((prev: boolean) => boolean)) => void;
  setSession: React.Dispatch<React.SetStateAction<SimSession | null>>;
};

export function useSimulationTransport({
  session,
  playing,
  playbackSpeed,
  pauseAnchors,
  setPlaying,
  setSession,
}: TransportArgs) {
  const playLoopRef = useRef(0);

  const scrubTo = useCallback((index: number) => {
    setSession((prev) => {
      if (!prev) return prev;
      const clamped = Math.max(0, Math.min(index, prev.steps.length - 1));
      return { ...prev, currentIndex: clamped };
    });
  }, [setSession]);

  const stepForward = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      if (prev.currentIndex >= prev.steps.length - 1) return prev;
      return { ...prev, currentIndex: prev.currentIndex + 1 };
    });
  }, [setSession]);

  const stepBack = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      if (prev.currentIndex <= 0) return prev;
      return { ...prev, currentIndex: prev.currentIndex - 1 };
    });
  }, [setSession]);

  const togglePlay = useCallback(() => {
    setPlaying((p) => !p);
  }, [setPlaying]);

  useEffect(() => {
    if (!playing || !session) {
      window.clearInterval(playLoopRef.current);
      return;
    }
    playLoopRef.current = window.setInterval(() => {
      setSession((prev) => {
        if (!prev || prev.currentIndex >= prev.steps.length - 1) {
          setPlaying(false);
          return prev;
        }
        const nextIndex = prev.currentIndex + 1;
        const nextStep = prev.steps[nextIndex];
        const hitPause =
          nextStep != null &&
          pauseAnchors.some(
            (p) => p.memberId === prev.memberId && p.line === nextStep.lineNumber,
          );
        if (hitPause) setPlaying(false);
        return { ...prev, currentIndex: nextIndex };
      });
    }, PLAY_INTERVAL_MS / playbackSpeed);
    return () => window.clearInterval(playLoopRef.current);
  }, [pauseAnchors, playing, playbackSpeed, session, setPlaying, setSession]);

  const clearPlayLoop = useCallback(() => {
    window.clearInterval(playLoopRef.current);
  }, []);

  return {
    scrubTo,
    stepForward,
    stepBack,
    togglePlay,
    clearPlayLoop,
  };
}
