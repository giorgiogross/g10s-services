import { useEffect, useRef, useState } from "react";
import { COLOURS, clamp, nextColour, start, step, type Bounce, type Bounds } from "../../lib/placeholder/bounce";
import { G10sXyzLogo } from "./G10sXyzLogo";

/** The logo drifting across the page like the DVD screensaver. Still and centred for reduced motion. */
export default function BouncingLogo() {
  const ref = useRef<HTMLDivElement>(null);
  const [colour, setColour] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const bounds = (): Bounds => ({ width: window.innerWidth - el.offsetWidth, height: window.innerHeight - el.offsetHeight });
    const place = ({ x, y }: Bounce) => (el.style.transform = `translate3d(${x}px, ${y}px, 0)`);

    setColour(Math.floor(Math.random() * COLOURS.length));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const b = bounds();
      place({ x: b.width / 2, y: b.height / 2, vx: 0, vy: 0 });
      setReady(true);
      return;
    }

    let state = start(bounds());
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(time) {
      // A backgrounded tab pauses rAF; cap the step so the logo doesn't jump on return.
      const seconds = Math.min((time - last) / 1000, 0.1);
      last = time;
      const next = step(state, seconds, bounds());
      state = next.state;
      if (next.hit) setColour((c) => nextColour(c));
      place(state);
      frame = requestAnimationFrame(tick);
    });
    const onResize = () => place((state = clamp(state, bounds())));
    window.addEventListener("resize", onResize);
    place(state);
    setReady(true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden className={`ph-logo${ready ? " is-ready" : ""}`} style={{ color: COLOURS[colour] }}>
      <G10sXyzLogo className="ph-logo__svg" />
    </div>
  );
}
