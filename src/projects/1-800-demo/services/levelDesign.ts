export const PLAY_W = 480;
export const PLAY_H = 262;
export const GROUND_H = 10;
export const BIRD_X = 120;
export const BIRD_SIZE = 52;
export const GRAVITY = 1100;
export const FLAP_V = -340;
export const LEVEL_START_DELAY = 1.6;

export const THEME_FADE_SECONDS = 0.8;

// Song length ≈ 2:51. Trigger WIN the moment we cross it.
export const WIN_AT = 171; // TEMP: lowered for verification

export type ThemeId = "navy" | "neon";

export interface Theme {
  bgBase: string;
  bgScanline: string;
  bgGrid: string;
  bgNearBar: string;
  bgGround: string;
  bgGroundChecker: string;
}

export const THEMES: Record<ThemeId, Theme> = {
  navy: {
    bgBase: "#0a0f1c",
    bgScanline: "#121827",
    bgGrid: "#1a2445",
    bgNearBar: "#223166",
    bgGround: "#1a2445",
    bgGroundChecker: "#223166",
  },
  neon: {
    bgBase: "#2a0a1a",
    bgScanline: "#40142a",
    bgGrid: "#7a1e4a",
    bgNearBar: "#a8285e",
    bgGround: "#3a1628",
    bgGroundChecker: "#7a1e4a",
  },
};

export interface PipePalette {
  outline: string;
  shadow: string;
  body: string;
  highlight: string;
  cap: string;
}

export const PIPE_PALETTE_NAVY: PipePalette = {
  outline: "#0c1540",
  shadow: "#1d2a66",
  body: "#3a4da8",
  highlight: "#6e82d8",
  cap: "#29399a",
};

export type ObstacleBlueprint =
  | {
      kind: "pipe";
      width: number;
      gapH: number;
      palette: PipePalette;
    }
  | {
      kind: "imageStack";
      width: number;
      gapH: number;
      src: string;
      brickHeight: number;
    };

export const PIPE_STD: ObstacleBlueprint = {
  kind: "pipe",
  width: 44,
  gapH: 155,
  palette: PIPE_PALETTE_NAVY,
};

export const PIPE_NARROW: ObstacleBlueprint = {
  kind: "pipe",
  width: 40,
  gapH: 142,
  palette: PIPE_PALETTE_NAVY,
};

export const NEON_BRICK: ObstacleBlueprint = {
  kind: "imageStack",
  width: 40,
  gapH: 145,
  src: "/1-800-demo/neon-light.png",
  brickHeight: 40,
};

export interface Phase {
  id: string;
  startAt: number;
  endAt?: number;
  spawnInterval: number;
  speed: number;
  gapBand: [number, number];
  gapJitter: number;
  theme: ThemeId;
  pick(rng: () => number): ObstacleBlueprint;
}

// Neon windows locked to: 1:10–1:40 and 2:23–2:51. Song ends at 2:51 → WIN.
export const PHASES: Phase[] = [
  { id: "warmup", startAt:   0,              spawnInterval: 1.8,  speed: 110, gapBand: [0.35, 0.65], gapJitter:  60, theme: "navy", pick: () => PIPE_STD },
  { id: "build",  startAt:  15,              spawnInterval: 1.55, speed: 125, gapBand: [0.30, 0.70], gapJitter:  80, theme: "navy", pick: () => PIPE_STD },
  { id: "ramp",   startAt:  45,              spawnInterval: 1.4,  speed: 135, gapBand: [0.28, 0.72], gapJitter:  90, theme: "navy", pick: () => PIPE_NARROW },
  { id: "neon-1", startAt:  70, endAt: 100,  spawnInterval: 1.35, speed: 140, gapBand: [0.28, 0.72], gapJitter:  90, theme: "neon", pick: () => NEON_BRICK },
  { id: "post-1", startAt: 100,              spawnInterval: 1.25, speed: 150, gapBand: [0.25, 0.75], gapJitter: 100, theme: "navy", pick: () => PIPE_NARROW },
  { id: "mid-2",  startAt: 120,              spawnInterval: 1.2,  speed: 155, gapBand: [0.22, 0.78], gapJitter: 110, theme: "navy", pick: () => PIPE_NARROW },
  { id: "neon-2", startAt: 143, endAt: WIN_AT, spawnInterval: 1.15, speed: 160, gapBand: [0.22, 0.78], gapJitter: 110, theme: "neon", pick: () => NEON_BRICK },
];

export function activePhaseAt(t: number): Phase {
  for (let i = PHASES.length - 1; i >= 0; i--) {
    const p = PHASES[i]!;
    if (t >= p.startAt && (p.endAt === undefined || t < p.endAt)) return p;
  }
  return PHASES[0]!;
}

export function seededRng(seed: number): () => number {
  let s = (Math.floor(seed * 1000) | 0) >>> 0;
  if (s === 0) s = 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export function chooseGapY(
  phase: Phase,
  prev: number | null,
  gapH: number,
  rng: () => number,
): number {
  const bandLo = PLAY_H * phase.gapBand[0];
  const bandHi = PLAY_H * phase.gapBand[1];
  const safeLo = Math.max(gapH / 2 + 8, bandLo);
  const safeHi = Math.min(PLAY_H - GROUND_H - gapH / 2 - 8, bandHi);
  if (safeLo > safeHi) return (bandLo + bandHi) / 2;
  if (prev === null) return (safeLo + safeHi) / 2;
  const lo = Math.max(safeLo, prev - phase.gapJitter);
  const hi = Math.min(safeHi, prev + phase.gapJitter);
  if (lo >= hi) return (safeLo + safeHi) / 2;
  return lo + (hi - lo) * rng();
}
