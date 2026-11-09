/** The DVD screensaver motion: straight 45° lines at a slow pace, a new colour on every edge hit. */

export const COLOURS = [
  "#22c55e", // green
  "#3b82f6", // blue
  "#facc15", // yellow
  "#ef4444", // red
  "#f97316", // orange
  "#a855f7", // purple
  "#f472b6", // rosa
] as const;

/** Pixels per second along each axis; equal on both axes keeps the path at 45°. */
export const SPEED = 60;

export type Bounce = { x: number; y: number; vx: number; vy: number };

/** The room the logo can move in: the viewport minus the logo's own size. */
export type Bounds = { width: number; height: number };

export type Random = () => number;

export function start(bounds: Bounds, random: Random = Math.random): Bounce {
  return {
    x: random() * Math.max(0, bounds.width),
    y: random() * Math.max(0, bounds.height),
    vx: random() < 0.5 ? -SPEED : SPEED,
    vy: random() < 0.5 ? -SPEED : SPEED,
  };
}

function axis(position: number, velocity: number, max: number): { position: number; velocity: number; hit: boolean } {
  const room = Math.max(0, max);
  const next = position + velocity;
  if (next <= 0) return { position: 0, velocity: Math.abs(velocity), hit: true };
  if (next >= room) return { position: room, velocity: -Math.abs(velocity), hit: true };
  return { position: next, velocity, hit: false };
}

/** Advances by `seconds`; `hit` is true when an edge was touched (a corner counts once). */
export function step(state: Bounce, seconds: number, bounds: Bounds): { state: Bounce; hit: boolean } {
  const h = axis(state.x, state.vx * seconds, bounds.width);
  const v = axis(state.y, state.vy * seconds, bounds.height);
  return {
    state: { x: h.position, y: v.position, vx: Math.sign(h.velocity) * SPEED, vy: Math.sign(v.velocity) * SPEED },
    hit: h.hit || v.hit,
  };
}

/** Keeps the logo inside after a resize. */
export function clamp(state: Bounce, bounds: Bounds): Bounce {
  return {
    ...state,
    x: Math.min(Math.max(0, state.x), Math.max(0, bounds.width)),
    y: Math.min(Math.max(0, state.y), Math.max(0, bounds.height)),
  };
}

/** Any colour index but the current one. */
export function nextColour(current: number, random: Random = Math.random): number {
  const offset = 1 + Math.floor(random() * (COLOURS.length - 1));
  return (current + offset) % COLOURS.length;
}
