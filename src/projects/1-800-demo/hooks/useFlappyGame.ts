import { useEffect, useRef, type RefObject } from "react";
import { FlappyEngine } from "../services/flappyEngine";
import { use1800DemoStore } from "../store/1-800-demo-store";

export interface FlappyGameApi {
  flap: () => void;
  setFlapHold: (pressed: boolean) => void;
}

export function useFlappyGame(
  canvasRef: RefObject<HTMLCanvasElement | null>,
): FlappyGameApi {
  const engineRef = useRef<FlappyEngine | null>(null);
  const gameState = use1800DemoStore((s) => s.gameState);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new FlappyEngine(canvas, {
      onScore: () => use1800DemoStore.getState().incScore(),
      onDie: () => use1800DemoStore.getState().die(),
      onWin: () => use1800DemoStore.getState().win(),
      onRoundDuration: (s) => use1800DemoStore.getState().setRoundDuration(s),
      getBest: () => use1800DemoStore.getState().best,
      getScore: () => use1800DemoStore.getState().score,
      getShareStep: () => use1800DemoStore.getState().shareStep,
    });
    engineRef.current = engine;

    const state = use1800DemoStore.getState().gameState;
    if (state === "playing") engine.enterPlaying();
    else if (state === "gameover") engine.enterGameover();
    else if (state === "won") engine.enterWon();
    else engine.enterIdle();

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (gameState === "idle") engine.enterIdle();
    else if (gameState === "playing") engine.enterPlaying();
    else if (gameState === "gameover") engine.enterGameover();
    else if (gameState === "won") engine.enterWon();
  }, [gameState]);

  return {
    flap: () => engineRef.current?.flap(),
    setFlapHold: (p: boolean) => engineRef.current?.setFlapHold(p),
  };
}
