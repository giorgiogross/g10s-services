import { describe, expect, it } from "vitest";
import { COLOURS, SPEED, clamp, nextColour, start, step } from "./bounce";

const bounds = { width: 1000, height: 600 };

describe("step", () => {
  it("moves at 45° and the same pace on both axes", () => {
    const { state, hit } = step({ x: 100, y: 100, vx: SPEED, vy: -SPEED }, 0.5, bounds);
    expect(state).toEqual({ x: 100 + SPEED / 2, y: 100 - SPEED / 2, vx: SPEED, vy: -SPEED });
    expect(hit).toBe(false);
  });

  it("bounces off the right edge and reports a hit", () => {
    const { state, hit } = step({ x: 995, y: 300, vx: SPEED, vy: SPEED }, 0.5, bounds);
    expect(state.x).toBe(1000);
    expect(state.vx).toBe(-SPEED);
    expect(state.vy).toBe(SPEED);
    expect(hit).toBe(true);
  });

  it("bounces off the top edge", () => {
    const { state, hit } = step({ x: 300, y: 5, vx: -SPEED, vy: -SPEED }, 0.5, bounds);
    expect(state.y).toBe(0);
    expect(state.vy).toBe(SPEED);
    expect(hit).toBe(true);
  });

  it("counts a corner as one hit and reverses both axes", () => {
    const { state, hit } = step({ x: 2, y: 2, vx: -SPEED, vy: -SPEED }, 1, bounds);
    expect(state).toEqual({ x: 0, y: 0, vx: SPEED, vy: SPEED });
    expect(hit).toBe(true);
  });

  it("stays at the origin when the viewport is smaller than the logo", () => {
    const { state } = step({ x: 0, y: 0, vx: SPEED, vy: SPEED }, 1, { width: -20, height: -10 });
    expect(state.x).toBe(0);
    expect(state.y).toBe(0);
  });
});

describe("start", () => {
  it("places the logo inside the bounds on a diagonal", () => {
    const state = start(bounds, () => 0.75);
    expect(state).toEqual({ x: 750, y: 450, vx: SPEED, vy: SPEED });
  });
});

describe("clamp", () => {
  it("pulls the logo back inside after the window shrinks", () => {
    expect(clamp({ x: 900, y: 700, vx: SPEED, vy: SPEED }, { width: 500, height: 400 })).toMatchObject({
      x: 500,
      y: 400,
    });
  });
});

describe("nextColour", () => {
  it("never repeats the current colour", () => {
    for (let current = 0; current < COLOURS.length; current++) {
      for (const r of [0, 0.3, 0.6, 0.999]) {
        const next = nextColour(current, () => r);
        expect(next).not.toBe(current);
        expect(next).toBeGreaterThanOrEqual(0);
        expect(next).toBeLessThan(COLOURS.length);
      }
    }
  });
});
