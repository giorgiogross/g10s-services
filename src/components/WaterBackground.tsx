"use client"

import { useEffect, useRef } from "react"

// ─── Vertex shader ────────────────────────────────────────────────────────────
const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

// ─── Fragment shader ──────────────────────────────────────────────────────────
// Ring-arc wave: the crest sits on a circle of radius RING_R around the cursor.
//
// Shape decomposition:
//   radial  — asymmetric ring profile: sharp inner wall (gap to cursor),
//             soft Gaussian outer fade → depth/body of the wave
//   angular — forward half-circle arc (cos^n masking), zero behind cursor →
//             bean/crescent silhouette
//
// The cursor is always INSIDE the ring; the visible wave is the arc ahead of it.
const FRAG = `
precision highp float;

uniform vec2  u_res;
uniform vec2  u_mouse;
uniform float u_time;
uniform float u_activity;
uniform vec2  u_vel;

// ── Ring-arc height field ─────────────────────────────────────────────────────
const float RING_R = 0.17;  // ring radius from cursor (fraction of screen height)
const float NS     = 0.024; // normal scale

float getH(vec2 p, vec2 cur, float asp, vec2 fwd) {
  vec2  dv = (p - cur) * vec2(asp, 1.0);
  float r  = length(dv);

  // Radial: smoothstep inner rise then Gaussian outer falloff
  //   inner:  0 at r=0.55R → 1 at r=R  (sharp wall — no wave inside the gap)
  //   outer:  1 at r=R → soft fade beyond  (gentle wave body)
  float inner  = smoothstep(RING_R * 0.55, RING_R, r);
  float dr     = max(r - RING_R, 0.0);
  float outer  = exp(-dr * dr / (RING_R * RING_R * 0.30));
  float radial = inner * outer;

  // Angular: cos^1.3 arc — peaks at fwd direction, zero at ±90°
  vec2  dir = r > 0.001 ? dv / r : fwd;
  float arc = pow(max(dot(dir, fwd), 0.0), 1.3);

  return radial * arc;
}

void main() {
  if (u_activity < 0.005) { gl_FragColor = vec4(0.0); return; }

  vec2  uv  = gl_FragCoord.xy / u_res;
  vec2  mUV = u_mouse / u_res;
  float asp = u_res.x / u_res.y;
  float t   = u_time;

  // Forward direction in aspect-corrected space
  vec2  velUV  = u_vel / u_res;
  vec2  velAsp = velUV * vec2(asp, 1.0);
  float spd    = length(velAsp);
  vec2  fwd    = spd > 0.001 ? velAsp / spd : vec2(0.0, 1.0);

  // Subtle arc shimmer: slowly rotate fwd ±3° for a living, breathing feel
  float sh  = sin(t * 1.6) * 0.052;
  float csh = cos(sh), ssh = sin(sh);
  vec2  fwdS = vec2(fwd.x * csh - fwd.y * ssh, fwd.x * ssh + fwd.y * csh);

  // ── Early exit — skip pixels clearly outside the ring arc ────────────────
  vec2  dvE = (uv - mUV) * vec2(asp, 1.0);
  float rE  = length(dvE);
  if (rE < RING_R * 0.38 || rE > RING_R * 2.6) { gl_FragColor = vec4(0.0); return; }
  if (rE > 0.001 && dot(dvE / rE, fwd) < -0.15) { gl_FragColor = vec4(0.0); return; }

  // ── Surface normal via finite differences ─────────────────────────────────
  float eps = 2.0 / u_res.y;
  float hpx = getH(uv + vec2(eps,  0.0), mUV, asp, fwdS);
  float hmx = getH(uv - vec2(eps,  0.0), mUV, asp, fwdS);
  float hpy = getH(uv + vec2(0.0,  eps), mUV, asp, fwdS);
  float hmy = getH(uv - vec2(0.0,  eps), mUV, asp, fwdS);

  float dome = getH(uv, mUV, asp, fwdS);
  if (dome < 0.04) { gl_FragColor = vec4(0.0); return; }

  vec3 N = normalize(vec3(
    -(hpx - hmx) * NS / (2.0 * eps),
    1.0,
    -(hpy - hmy) * NS / (2.0 * eps)
  ));

  // ── Blinn-Phong ────────────────────────────────────────────────────────────
  vec3  L    = normalize(vec3(-0.15, 0.97, 0.18));
  vec3  Hvec = normalize(L + vec3(0.0, 1.0, 0.0));
  float diff = max(dot(N, L), 0.0) * 0.35 + 0.65;
  float sd   = max(dot(N, Hvec), 0.0);
  float spec = sd > 0.50 ? pow(sd, 42.0) * 1.5 : 0.0;
  float luma = min(diff * 0.70 + spec * 0.36, 1.0);

  // ── Iridescence — concentric rings via N.y ────────────────────────────────
  float slope  = 1.0 - N.y;
  float iriStr = slope * slope * 0.70;
  float phase  = slope * 7.0;
  vec3 color = clamp(vec3(
    luma + cos(phase)         * iriStr,
    luma + cos(phase + 2.094) * iriStr,
    luma + cos(phase + 4.189) * iriStr
  ), 0.0, 1.0);

  // ── Edge colorization: blue→purple→orange on the arc rim ─────────────────
  // dome≈1 at crest, dome→0 at edges — invert to drive the color ramp
  float colorT    = clamp((1.0 - dome) * 1.3, 0.0, 1.0);
  vec3  edgeCol   = colorT < 0.5
    ? mix(vec3(0.12, 0.28, 0.92), vec3(0.58, 0.10, 0.86), colorT * 2.0)
    : mix(vec3(0.58, 0.10, 0.86), vec3(0.94, 0.38, 0.08), (colorT - 0.5) * 2.0);
  float edgeBlend = smoothstep(0.35, 0.88, 1.0 - dome) * dome * 0.62;
  color = mix(color, edgeCol, edgeBlend);

  // ── Alpha: gated by dome so nothing is visible outside the arc ───────────
  float fresnel = pow(slope, 2.0);
  float alpha   = clamp(dome * (0.20 + spec * 0.65 + fresnel * 0.42), 0.0, 0.82);

  float a = alpha * u_activity;
  gl_FragColor = vec4(color * a, a);
}
`

// ─── WebGL helpers ────────────────────────────────────────────────────────────
function makeShader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(s) ?? "shader compile error")
  return s
}

function makeProgram(gl: WebGLRenderingContext, vert: string, frag: string) {
  const prog = gl.createProgram()!
  gl.attachShader(prog, makeShader(gl, gl.VERTEX_SHADER, vert))
  gl.attachShader(prog, makeShader(gl, gl.FRAGMENT_SHADER, frag))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(prog) ?? "program link error")
  return prog
}

// ─── Component ────────────────────────────────────────────────────────────────
export function WaterBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = (
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl")
    ) as WebGLRenderingContext | null
    if (!gl) return

    let prog: WebGLProgram
    try {
      prog = makeProgram(gl, VERT, FRAG)
    } catch (e) {
      console.error("[WaterBackground] shader error:", e)
      return
    }

    // Full-screen quad (TRIANGLE_STRIP: 2 triangles, 4 verts)
    const vbo = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1, -1,  1, -1,  -1, 1,  1, 1]),
      gl.STATIC_DRAW)

    const aPos      = gl.getAttribLocation(prog,  "a_pos")
    const uRes      = gl.getUniformLocation(prog, "u_res")
    const uMouse    = gl.getUniformLocation(prog, "u_mouse")
    const uTime     = gl.getUniformLocation(prog, "u_time")
    const uActivity = gl.getUniformLocation(prog, "u_activity")
    const uVel      = gl.getUniformLocation(prog, "u_vel")

    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
    gl.useProgram(prog)

    // Premultiplied-alpha blending: dst = src.rgb + dst.rgb*(1-src.a)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    function resize() {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener("resize", resize)

    // Mouse tracking — smoothed (α=0.20) so the dome glides
    // Y is flipped: WebGL has y=0 at bottom, browser has y=0 at top
    let rawX = -1, rawY = -1, mx = -1, my = -1
    let lastMoveTime = -Infinity   // timestamp of last mousemove event
    let prevRawX = -1, prevRawY = -1
    let velX = 0, velY = 0        // smoothed cursor velocity (pixels per event)

    function onMove(e: MouseEvent) {
      const nx = e.clientX
      const ny = window.innerHeight - e.clientY
      if (prevRawX >= 0) {
        velX = velX * 0.72 + (nx - prevRawX) * 0.28
        velY = velY * 0.72 + (ny - prevRawY) * 0.28
      }
      prevRawX = nx; prevRawY = ny
      rawX = nx; rawY = ny
      lastMoveTime = performance.now()
    }
    function onLeave() {
      rawX = -1; rawY = -1
      prevRawX = -1; prevRawY = -1
      velX = 0; velY = 0
    }
    window.addEventListener("mousemove", onMove)
    document.addEventListener("mouseleave", onLeave)

    let raf = 0
    const t0 = performance.now()

    function frame() {
      raf = requestAnimationFrame(frame)

      // Smooth toward raw position
      if (rawX < 0) {
        mx = -1; my = -1
      } else if (mx < 0) {
        mx = rawX; my = rawY          // snap on first appearance
      } else {
        mx = mx * 0.80 + rawX * 0.20
        my = my * 0.80 + rawY * 0.20
      }

      // Fade in instantly on movement, fade out over 900 ms after stopping
      const FADE_MS = 900
      const timeSinceMove = rawX < 0 ? Infinity : performance.now() - lastMoveTime
      const activity = Math.max(0, 1 - timeSinceMove / FADE_MS)

      // Slowly decay velocity so the arc direction is preserved during the fade-out
      if (timeSinceMove > 80) {
        velX *= 0.96
        velY *= 0.96
      }

      const t = (performance.now() - t0) / 1000

      gl.uniform2f(uRes,      canvas.width, canvas.height)
      gl.uniform2f(uMouse,    mx, my)
      gl.uniform1f(uTime,     t)
      gl.uniform1f(uActivity, activity)
      gl.uniform2f(uVel,      velX, velY)

      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    frame()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
      window.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseleave", onLeave)
      gl.deleteBuffer(vbo)
      gl.deleteProgram(prog)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 1,
      }}
    />
  )
}
