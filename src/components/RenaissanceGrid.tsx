"use client"

import { forwardRef, useEffect, useRef, useState, useCallback } from "react"

// SVG viewBox dimensions
const W = 1600
const H = 900
const CX = W / 2   // 800
const CY = H / 2   // 450

// Circle geometry
const CIRCLE_INSET = 80
const CIRCLE_R = CY - CIRCLE_INSET  // 370 — bottom of top circle touches CY

// Grid line positions
const LEFT_THIRD = W / 3            // 533.33
const RIGHT_THIRD = W - LEFT_THIRD  // 1066.67
const THIRD_OFFSET = CX - LEFT_THIRD // 266.67
const TOP_THIRD = CY - THIRD_OFFSET  // 183.33
const BOTTOM_THIRD = CY + THIRD_OFFSET // 716.67

// Glow parameters
const SPREAD = 240          // gradient half-length along line (SVG units)
const MAX_GLOW = 0.55       // peak glow opacity at hotspot
const INFLUENCE = H * 0.4   // influence radius

// Circle arc spread constants and easing
const ARC_OUTSIDE = Math.PI / 6   // 30° half-arc when mouse is outside
const ARC_INSIDE  = Math.PI / 2   // 90° half-arc when mouse is inside
const ARC_EASE    = 0.10          // lerp factor per rAF frame (~10 frames to settle)

// Mouse lag — display position trails the real cursor by ~200 ms
const MOUSE_EASE  = 0.06          // lerp factor per frame: ~72% caught up after 350 ms at 60 fps

type LineType = "h" | "v" | "d"

const LINES: { id: string; x1: number; y1: number; x2: number; y2: number; type: LineType }[] = [
  { id: "hctr",  x1: 0,           y1: CY,           x2: W,           y2: CY,           type: "h" },
  { id: "vctr",  x1: CX,          y1: 0,             x2: CX,          y2: H,            type: "v" },
  { id: "dtlbr", x1: 0,           y1: 0,             x2: W,           y2: H,            type: "d" },
  { id: "dtrbl", x1: W,           y1: 0,             x2: 0,           y2: H,            type: "d" },
  { id: "vl3",   x1: LEFT_THIRD,  y1: 0,             x2: LEFT_THIRD,  y2: H,            type: "v" },
  { id: "vr3",   x1: RIGHT_THIRD, y1: 0,             x2: RIGHT_THIRD, y2: H,            type: "v" },
  { id: "ht3",   x1: 0,           y1: TOP_THIRD,     x2: W,           y2: TOP_THIRD,    type: "h" },
  { id: "hb3",   x1: 0,           y1: BOTTOM_THIRD,  x2: W,           y2: BOTTOM_THIRD, type: "h" },
]

const CIRCLES = [
  { id: "ctop", ccx: CX, ccy: CIRCLE_INSET,      r: CIRCLE_R },
  { id: "cbot", ccx: CX, ccy: H - CIRCLE_INSET,  r: CIRCLE_R },
]

// Orthogonal projection of (px,py) onto the line segment P1→P2, clamped to segment
function projectOntoLine(
  px: number, py: number,
  x1: number, y1: number, x2: number, y2: number,
) {
  const dx = x2 - x1, dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return { x: x1, y: y1 }
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq))
  return { x: x1 + t * dx, y: y1 + t * dy }
}

// Perpendicular distance from (px,py) to the infinite line through P1→P2
function perpDist(
  px: number, py: number,
  x1: number, y1: number, x2: number, y2: number,
) {
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.hypot(dx, dy)
  if (len === 0) return Math.hypot(px - x1, py - y1)
  return Math.abs((py - y1) * dx - (px - x1) * dy) / len
}

// Quadratic falloff: 1 at dist=0, 0 at dist≥INFLUENCE
function falloff(dist: number): number {
  if (dist >= INFLUENCE) return 0
  const t = 1 - dist / INFLUENCE
  return t * t
}

const BASE = "rgba(0, 0, 0, 0.04)"
const GLOW_COLOR = "80, 80, 80"   // pure gold yellow (#FFD700) — bright, not brown

type ArcSpreads = Record<string, number>

/**
 * Renaissance-style composition grid overlay.
 * Fills its container completely. Transparent, no click interception.
 * Responds to mouse position with light reflections on each grid element.
 * Arc spread transitions are eased smoothly when crossing circle boundaries.
 */
const RenaissanceGrid = forwardRef<HTMLDivElement>(function RenaissanceGrid(
  _props,
  ref,
) {
  const svgRef = useRef<SVGSVGElement>(null)

  // mouseRef: true cursor position, updated on every mousemove without re-rendering
  const mouseRef = useRef({ x: -9999, y: -9999 })
  // displayMouseRef: lagged position that lerps toward mouseRef each rAF frame
  const displayMouseRef = useRef({ x: -9999, y: -9999 })

  // arcSpreadsRef: mutable animated values, driven by the rAF loop
  const arcSpreadsRef = useRef<ArcSpreads>(
    Object.fromEntries(CIRCLES.map(({ id }) => [id, ARC_OUTSIDE]))
  )

  // hasMouseRef: flips true the moment a real mousemove fires.
  // Until then the sinusoidal path runs (covers mobile + pre-hover desktop).
  const hasMouseRef = useRef(false)
  const mobileInitRef = useRef(false)  // snap display position on first no-mouse frame
  // Six random phase offsets so the sinusoidal path is different every session
  const mobilePhasesRef = useRef(
    Array.from({ length: 6 }, () => Math.random() * Math.PI * 2)
  )

  // Single render state combining mouse + arc spreads, updated only when something changed
  const [frame, setFrame] = useState<{
    mouse: { x: number; y: number }
    arcSpreads: ArcSpreads
  }>({
    mouse: { x: -9999, y: -9999 },
    arcSpreads: Object.fromEntries(CIRCLES.map(({ id }) => [id, ARC_OUTSIDE])),
  })

  const toSVGCoords = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: CX, y: CY }
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: CX, y: CY }
    const sp = pt.matrixTransform(ctm.inverse())
    return { x: sp.x, y: sp.y }
  }, [])

  // First real mousemove → lock into desktop mode permanently
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      hasMouseRef.current = true
      mouseRef.current = toSVGCoords(e.clientX, e.clientY)
    }
    window.addEventListener("mousemove", onMove, { passive: true })
    return () => window.removeEventListener("mousemove", onMove)
  }, [toSVGCoords])

  // rAF loop: lerps display mouse toward true mouse, then lerps arc spreads
  useEffect(() => {
    let rafId: number

    const tick = () => {
      // No mouse detected yet (mobile or pre-hover desktop) → sinusoidal path
      if (!hasMouseRef.current) {
        const t = performance.now() / 1000
        const p = mobilePhasesRef.current
        const sx = CX + Math.sin(t * 0.20 + p[0]) * W * 0.28 + Math.sin(t * 0.11 + p[1]) * W * 0.10 + Math.sin(t * 0.31 + p[2]) * W * 0.05
        const sy = CY + Math.sin(t * 0.17 + p[3]) * H * 0.28 + Math.sin(t * 0.13 + p[4]) * H * 0.10 + Math.sin(t * 0.23 + p[5]) * H * 0.05
        mouseRef.current = { x: sx, y: sy }
        // Snap display onto the path on the very first frame to avoid off-screen crawl
        if (!mobileInitRef.current) {
          mobileInitRef.current = true
          displayMouseRef.current = { x: sx, y: sy }
        }
      }

      // Lerp display position toward target — creates the ~350 ms lag
      const { x: tx, y: ty } = mouseRef.current
      const { x: dx, y: dy } = displayMouseRef.current
      const nx = dx + (tx - dx) * MOUSE_EASE
      const ny = dy + (ty - dy) * MOUSE_EASE
      const displayMoved = Math.hypot(nx - dx, ny - dy) > 0.05
      if (displayMoved) displayMouseRef.current = { x: nx, y: ny }

      const mx = displayMouseRef.current.x
      const my = displayMouseRef.current.y

      // Lerp arc spreads using the lagged display position
      let arcChanged = false
      CIRCLES.forEach(({ id, ccx, ccy, r }) => {
        const dc = Math.hypot(mx - ccx, my - ccy)
        const target = dc < r ? ARC_INSIDE : ARC_OUTSIDE
        const current = arcSpreadsRef.current[id]
        const delta = target - current
        if (Math.abs(delta) > 0.0005) {
          arcSpreadsRef.current[id] = current + delta * ARC_EASE
          arcChanged = true
        } else if (current !== target) {
          arcSpreadsRef.current[id] = target
          arcChanged = true
        }
      })

      if (displayMoved || arcChanged) {
        setFrame({
          mouse: { x: mx, y: my },
          arcSpreads: { ...arcSpreadsRef.current },
        })
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  const { x: mx, y: my } = frame.mouse

  // ── Line glow data ──
  const lineGlows = LINES.map(({ id, x1, y1, x2, y2, type }) => {
    let hx: number, hy: number, dist: number

    if (type === "h") {
      hx = mx; hy = y1; dist = Math.abs(my - y1)
    } else if (type === "v") {
      hx = x1; hy = my; dist = Math.abs(mx - x1)
    } else {
      const proj = projectOntoLine(mx, my, x1, y1, x2, y2)
      hx = proj.x; hy = proj.y
      dist = perpDist(mx, my, x1, y1, x2, y2)
    }

    const intens = falloff(dist)
    const dx = x2 - x1, dy = y2 - y1
    const len = Math.hypot(dx, dy)
    const nx = dx / len, ny = dy / len

    return {
      id, x1, y1, x2, y2, intens,
      gx1: hx - SPREAD * nx, gy1: hy - SPREAD * ny,
      gx2: hx + SPREAD * nx, gy2: hy + SPREAD * ny,
    }
  })

  // ── Circle glow data ──
  const circleGlows = CIRCLES.map(({ id, ccx, ccy, r }) => {
    const dc = Math.hypot(mx - ccx, my - ccy)
    const dist = Math.abs(dc - r)
    const intens = falloff(dist)

    const angle = Math.atan2(my - ccy, mx - ccx)
    const hx = ccx + r * Math.cos(angle)
    const hy = ccy + r * Math.sin(angle)

    // Use the animated (eased) arc spread from the rAF loop
    const arcSpread = frame.arcSpreads[id]
    const tx = -Math.sin(angle), ty = Math.cos(angle)
    const arcChordHalf = r * Math.sin(arcSpread)

    const a1 = angle - arcSpread, a2 = angle + arcSpread
    const ax1 = ccx + r * Math.cos(a1), ay1 = ccy + r * Math.sin(a1)
    const ax2 = ccx + r * Math.cos(a2), ay2 = ccy + r * Math.sin(a2)
    const largeArc = arcSpread * 2 > Math.PI ? 1 : 0
    const arcPath = `M ${ax1} ${ay1} A ${r} ${r} 0 ${largeArc} 1 ${ax2} ${ay2}`

    return {
      id, intens, arcPath,
      gx1: hx + arcChordHalf * tx, gy1: hy + arcChordHalf * ty,
      gx2: hx - arcChordHalf * tx, gy2: hy - arcChordHalf * ty,
    }
  })

  return (
    <div
      ref={ref}
      className="lp-renaissance-grid"
      aria-hidden="true"
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        className="lp-renaissance-grid-svg"
      >
        <defs>
          <filter
            id="rg-glow"
            filterUnits="userSpaceOnUse"
            x="-100" y="-100"
            width={W + 200} height={H + 200}
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.2" />
          </filter>

          {lineGlows.map(({ id, gx1, gy1, gx2, gy2, intens }) => (
            <linearGradient
              key={id}
              id={`rg-lg-${id}`}
              gradientUnits="userSpaceOnUse"
              x1={gx1} y1={gy1} x2={gx2} y2={gy2}
            >
              <stop offset="0"   stopColor={`rgb(${GLOW_COLOR})`} stopOpacity={0} />
              <stop offset="0.5" stopColor={`rgb(${GLOW_COLOR})`} stopOpacity={intens * MAX_GLOW} />
              <stop offset="1"   stopColor={`rgb(${GLOW_COLOR})`} stopOpacity={0} />
            </linearGradient>
          ))}

          {circleGlows.map(({ id, gx1, gy1, gx2, gy2, intens }) => (
            <linearGradient
              key={id}
              id={`rg-cg-${id}`}
              gradientUnits="userSpaceOnUse"
              x1={gx1} y1={gy1} x2={gx2} y2={gy2}
            >
              <stop offset="0"   stopColor={`rgb(${GLOW_COLOR})`} stopOpacity={0} />
              <stop offset="0.5" stopColor={`rgb(${GLOW_COLOR})`} stopOpacity={intens * MAX_GLOW} />
              <stop offset="1"   stopColor={`rgb(${GLOW_COLOR})`} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

        {/* ── Base grid — always visible, very faint ── */}
        {LINES.map(({ id, x1, y1, x2, y2 }) => (
          <line key={id} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={BASE} strokeWidth={1} />
        ))}
        {CIRCLES.map(({ id, ccx, ccy, r }) => (
          <circle key={id} cx={ccx} cy={ccy} r={r}
            stroke={BASE} strokeWidth={0.5} fill="none" />
        ))}

        {/* ── Very subtle blurred halo ── */}
        {lineGlows.filter(g => g.intens > 0.01).map(({ id, x1, y1, x2, y2 }) => (
          <line key={`b-${id}`} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={`url(#rg-lg-${id})`} strokeWidth={0.3}
            filter="url(#rg-glow)" />
        ))}
        {circleGlows.filter(g => g.intens > 0.01).map(({ id, arcPath }) => (
          <path key={`b-${id}`} d={arcPath} fill="none"
            stroke={`url(#rg-cg-${id})`} strokeWidth={0.3} strokeLinecap="round"
            filter="url(#rg-glow)" />
        ))}

        {/* ── Sharp highlight ── */}
        {lineGlows.filter(g => g.intens > 0.01).map(({ id, x1, y1, x2, y2 }) => (
          <line key={`s-${id}`} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={`url(#rg-lg-${id})`} strokeWidth={0.5} />
        ))}
        {circleGlows.filter(g => g.intens > 0.01).map(({ id, arcPath }) => (
          <path key={`s-${id}`} d={arcPath} fill="none"
            stroke={`url(#rg-cg-${id})`} strokeWidth={0.5} strokeLinecap="round" />
        ))}
      </svg>
    </div>
  )
})

export { RenaissanceGrid }
