import { create } from "zustand";
import { getBest, setBest } from "../services/bestScore";

export type GameState = "idle" | "playing" | "gameover" | "won";
export type Tab = "play" | "sources" | "g10s";

// Sub-state machine that only applies when gameState === 'won'.
//   'intro'   → "YOU WON / SHARE WITH FRIENDS"
//   'prompt'  → "SHARE SCREENSHOT / ▸ YES · NO"
//   'done'    → post-share idle (heart = restart)
export type ShareStep = "intro" | "prompt" | "done";

export interface State1800Demo {
  gameState: GameState;
  score: number;
  best: number;
  roundDuration: number;
  tab: Tab;
  shareStep: ShareStep;

  start: () => void;
  die: () => void;
  win: () => void;
  reset: () => void;
  incScore: () => void;
  setRoundDuration: (seconds: number) => void;
  setTab: (t: Tab) => void;
  setShareStep: (s: ShareStep) => void;
}

export const use1800DemoStore = create<State1800Demo>((set, get) => ({
  gameState: "idle",
  score: 0,
  best: getBest(),
  roundDuration: 0,
  tab: "play",
  shareStep: "intro",

  start: () =>
    set({ gameState: "playing", score: 0, roundDuration: 0, shareStep: "intro" }),
  die: () => {
    const { score, best } = get();
    const newBest = Math.max(score, best);
    if (newBest > best) setBest(newBest);
    set({ gameState: "gameover", best: newBest });
  },
  win: () => {
    const { score, best } = get();
    const newBest = Math.max(score, best);
    if (newBest > best) setBest(newBest);
    set({ gameState: "won", best: newBest, shareStep: "intro" });
  },
  reset: () =>
    set({ gameState: "idle", score: 0, roundDuration: 0, shareStep: "intro" }),
  incScore: () => set((s) => ({ score: s.score + 1 })),
  setRoundDuration: (seconds) => set({ roundDuration: seconds }),
  setTab: (t) => set({ tab: t }),
  setShareStep: (s) => set({ shareStep: s }),
}));
