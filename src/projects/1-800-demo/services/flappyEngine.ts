import {
  PLAY_W,
  PLAY_H,
  GROUND_H,
  BIRD_X,
  BIRD_SIZE,
  GRAVITY,
  FLAP_V,
  LEVEL_START_DELAY,
  THEME_FADE_SECONDS,
  WIN_AT,
  activePhaseAt,
  seededRng,
  chooseGapY,
  THEMES,
  type Theme,
  type ThemeId,
  type ObstacleBlueprint,
  type PipePalette,
} from "./levelDesign";

export type ShareStepForEngine = "intro" | "prompt" | "done";

export interface EngineHooks {
  onScore: () => void;
  onDie: () => void;
  onWin: () => void;
  onRoundDuration: (seconds: number) => void;
  getBest: () => number;
  getScore: () => number;
  getShareStep: () => ShareStepForEngine;
}

type Mode = "idle" | "playing" | "gameover" | "won";

interface Obstacle {
  x: number;
  width: number;
  gapY: number;
  gapH: number;
  passed: boolean;
  blueprint: ObstacleBlueprint;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Line {
  text: string;
  size: number;
  color: string;
}

// ---------- image asset cache ----------
const imgCache = new Map<string, HTMLImageElement>();

function getImage(src: string): HTMLImageElement {
  let img = imgCache.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    imgCache.set(src, img);
  }
  return img;
}

// ---------- color helpers ----------
function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function toHex(r: number, g: number, b: number): string {
  const c = (x: number) =>
    Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0");
  return "#" + c(r) + c(g) + c(b);
}

function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  return toHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

function lerpTheme(from: Theme, to: Theme, t: number): Theme {
  return {
    bgBase: lerpColor(from.bgBase, to.bgBase, t),
    bgScanline: lerpColor(from.bgScanline, to.bgScanline, t),
    bgGrid: lerpColor(from.bgGrid, to.bgGrid, t),
    bgNearBar: lerpColor(from.bgNearBar, to.bgNearBar, t),
    bgGround: lerpColor(from.bgGround, to.bgGround, t),
    bgGroundChecker: lerpColor(from.bgGroundChecker, to.bgGroundChecker, t),
  };
}

// ---------- utility ----------
function pad4(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(4, "0");
}

function mmss(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function rectOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ~680ms cycle, 50% duty: half visible, half hidden.
function blinkOn(ts: number): boolean {
  return Math.sin(ts / 110) > 0;
}

// ---------- engine ----------
export class FlappyEngine {
  private ctx: CanvasRenderingContext2D;
  private rafId = 0;
  private lastTs = 0;
  private mode: Mode = "idle";
  private readonly hooks: EngineHooks;

  private birdY = PLAY_H / 2;
  private birdVy = 0;

  private obstacles: Obstacle[] = [];
  private nextSpawnT = LEVEL_START_DELAY;
  private prevGapY: number | null = null;
  private elapsed = 0;
  private roundDurationLastWrite = 0;

  private heartImg = getImage("/1-800-demo/pixel-heart-100x100.webp");

  private themeFrom: Theme = THEMES.navy;
  private themeToId: ThemeId = "navy";
  private themeFadeT = 1;
  private currentThemeId: ThemeId = "navy";

  private flapHoldTarget = 0;
  private flapHoldEased = 0;

  private pxGridOffset = 0;
  private pxBarOffset = 0;
  private pxGroundOffset = 0;

  private fontReady = false;

  constructor(canvas: HTMLCanvasElement, hooks: EngineHooks) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2D context");
    this.ctx = ctx;
    ctx.imageSmoothingEnabled = false;
    this.hooks = hooks;

    // preload image obstacles used in phase table
    getImage("/1-800-demo/neon-light.png");

    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts
        .load("40px 'Jersey 10'")
        .then(() => {
          this.fontReady = true;
        })
        .catch(() => {
          /* ignore */
        });
    }

    this.loop = this.loop.bind(this);
    this.rafId = requestAnimationFrame(this.loop);
  }

  dispose(): void {
    cancelAnimationFrame(this.rafId);
  }

  enterIdle(): void {
    this.mode = "idle";
    this.resetRoundState();
    this.currentThemeId = "navy";
    this.themeFrom = THEMES.navy;
    this.themeToId = "navy";
    this.themeFadeT = 1;
  }

  enterPlaying(): void {
    this.mode = "playing";
    this.resetRoundState();
    // initial impulse so first press gives lift
    this.birdVy = FLAP_V;
  }

  enterGameover(): void {
    this.mode = "gameover";
  }

  enterWon(): void {
    this.mode = "won";
  }

  flap(): void {
    if (this.mode !== "playing") return;
    this.birdVy = FLAP_V;
  }

  setFlapHold(pressed: boolean): void {
    this.flapHoldTarget = pressed ? 1 : 0;
  }

  private resetRoundState(): void {
    this.obstacles = [];
    this.birdY = PLAY_H / 2;
    this.birdVy = 0;
    this.nextSpawnT = LEVEL_START_DELAY;
    this.prevGapY = null;
    this.elapsed = 0;
    this.roundDurationLastWrite = 0;
  }

  private loop(ts: number): void {
    this.rafId = requestAnimationFrame(this.loop);
    if (!this.lastTs) this.lastTs = ts;
    const dtMs = ts - this.lastTs;
    this.lastTs = ts;
    // cap dt to avoid huge jumps after backgrounded tab
    const dt = Math.min(dtMs / 1000, 0.05);

    // ease flap-hold
    const tau = 0.05;
    this.flapHoldEased +=
      (this.flapHoldTarget - this.flapHoldEased) * (1 - Math.exp(-dt / tau));

    if (this.mode === "playing") this.updatePlaying(dt);
    else if (this.mode === "idle") this.updateIdle(dt);

    this.draw(ts);
  }

  private updateIdle(dt: number): void {
    this.pxGridOffset = (this.pxGridOffset + 20 * dt) % 16;
    this.pxBarOffset = (this.pxBarOffset + 50 * dt) % 48;
    this.pxGroundOffset = (this.pxGroundOffset + 80 * dt) % 16;
  }

  private updatePlaying(dt: number): void {
    this.elapsed += dt;

    // Win condition: reached end of song.
    if (this.elapsed >= WIN_AT) {
      this.hooks.onWin();
      return;
    }

    // theme crossfade
    const phase = activePhaseAt(this.elapsed);
    if (phase.theme !== this.currentThemeId) {
      // snapshot current rendered theme as the new "from"
      this.themeFrom = lerpTheme(
        this.themeFrom,
        THEMES[this.themeToId],
        this.themeFadeT,
      );
      this.themeToId = phase.theme;
      this.themeFadeT = 0;
      this.currentThemeId = phase.theme;
    }
    this.themeFadeT = Math.min(1, this.themeFadeT + dt / THEME_FADE_SECONDS);

    // parallax
    const speed = phase.speed;
    this.pxGridOffset = (this.pxGridOffset + 0.25 * speed * dt) % 16;
    this.pxBarOffset = (this.pxBarOffset + 0.6 * speed * dt) % 48;
    this.pxGroundOffset = (this.pxGroundOffset + speed * dt) % 16;

    // physics
    this.birdVy += GRAVITY * dt;
    this.birdY += this.birdVy * dt;

    // spawn
    while (this.elapsed >= this.nextSpawnT) {
      const ph = activePhaseAt(this.nextSpawnT);
      const rng = seededRng(this.nextSpawnT);
      const bp = ph.pick(rng);
      const gapY = chooseGapY(ph, this.prevGapY, bp.gapH, rng);
      const dx = (this.elapsed - this.nextSpawnT) * ph.speed;
      this.obstacles.push({
        x: PLAY_W - dx,
        width: bp.width,
        gapY,
        gapH: bp.gapH,
        passed: false,
        blueprint: bp,
      });
      this.prevGapY = gapY;
      this.nextSpawnT += ph.spawnInterval;
    }

    // move
    for (const o of this.obstacles) o.x -= phase.speed * dt;

    // score
    for (const o of this.obstacles) {
      if (!o.passed && o.x + o.width < BIRD_X) {
        o.passed = true;
        this.hooks.onScore();
      }
    }

    // prune
    this.obstacles = this.obstacles.filter((o) => o.x + o.width > -8);

    // collision (hitbox scales with flap-hold)
    const scale = 1 - 0.2 * this.flapHoldEased;
    const size = BIRD_SIZE * scale * 0.72;
    const birdRect: Rect = {
      x: BIRD_X - size / 2,
      y: this.birdY - size / 2,
      w: size,
      h: size,
    };
    const groundY = PLAY_H - GROUND_H;
    if (birdRect.y + birdRect.h > groundY || birdRect.y < 0) {
      this.hooks.onDie();
      return;
    }
    for (const o of this.obstacles) {
      if (o.x > birdRect.x + birdRect.w || o.x + o.width < birdRect.x) continue;
      const topRect: Rect = { x: o.x, y: 0, w: o.width, h: o.gapY - o.gapH / 2 };
      const botRect: Rect = {
        x: o.x,
        y: o.gapY + o.gapH / 2,
        w: o.width,
        h: groundY - (o.gapY + o.gapH / 2),
      };
      if (rectOverlap(birdRect, topRect) || rectOverlap(birdRect, botRect)) {
        this.hooks.onDie();
        return;
      }
    }

    // throttled roundDuration write
    if (this.elapsed - this.roundDurationLastWrite >= 0.25) {
      this.roundDurationLastWrite = this.elapsed;
      this.hooks.onRoundDuration(this.elapsed);
    }
  }

  // ---------- drawing ----------
  private draw(ts: number): void {
    const ctx = this.ctx;
    const theme = lerpTheme(
      this.themeFrom,
      THEMES[this.themeToId],
      this.themeFadeT,
    );

    // base
    ctx.fillStyle = theme.bgBase;
    ctx.fillRect(0, 0, PLAY_W, PLAY_H);

    // scanlines
    ctx.fillStyle = theme.bgScanline;
    for (let y = 0; y < PLAY_H; y += 4) {
      ctx.fillRect(0, y, PLAY_W, 1);
    }

    // far grid
    ctx.fillStyle = theme.bgGrid;
    for (let x = -this.pxGridOffset; x < PLAY_W; x += 16) {
      for (let y = 8; y < PLAY_H - GROUND_H; y += 16) {
        ctx.fillRect(Math.floor(x), y, 1, 1);
      }
    }

    // near bars
    ctx.fillStyle = theme.bgNearBar;
    for (let x = -this.pxBarOffset; x < PLAY_W; x += 48) {
      ctx.fillRect(Math.floor(x), 0, 1, PLAY_H - GROUND_H);
    }

    // ground
    const groundY = PLAY_H - GROUND_H;
    ctx.fillStyle = theme.bgGround;
    ctx.fillRect(0, groundY, PLAY_W, GROUND_H);
    ctx.fillStyle = theme.bgGroundChecker;
    for (let x = -this.pxGroundOffset; x < PLAY_W; x += 4) {
      for (let y = 0; y < GROUND_H; y += 4) {
        const odd = (Math.floor(x / 2) + Math.floor(y / 2)) & 1;
        if (odd) ctx.fillRect(Math.floor(x), groundY + y, 2, 2);
      }
    }

    // obstacles
    for (const o of this.obstacles) this.drawObstacle(o);

    // bird
    const scale = 1 - 0.2 * this.flapHoldEased;
    const size = BIRD_SIZE * scale;
    let y = this.birdY;
    if (this.mode === "idle") {
      y = PLAY_H / 2 - 32 + Math.sin((ts / 1000) * 3) * 4;
    }
    if (this.heartImg.complete && this.heartImg.naturalWidth > 0) {
      ctx.drawImage(
        this.heartImg,
        Math.round(BIRD_X - size / 2),
        Math.round(y - size / 2),
        Math.round(size),
        Math.round(size),
      );
    }

    // overlays
    if (this.mode === "idle") this.drawIdleOverlay();
    if (this.mode === "gameover") this.drawGameOverOverlay();
    if (this.mode === "won") this.drawWonOverlay(ts);

    // HUD last (always on top)
    this.drawScoreHud();
  }

  private drawObstacle(o: Obstacle): void {
    const ctx = this.ctx;
    const bp = o.blueprint;
    const topH = Math.max(0, o.gapY - o.gapH / 2);
    const botY = o.gapY + o.gapH / 2;
    const groundY = PLAY_H - GROUND_H;
    const botH = Math.max(0, groundY - botY);

    if (bp.kind === "pipe") {
      drawPipe(ctx, o.x, 0, o.width, topH, bp.palette, "top");
      drawPipe(ctx, o.x, botY, o.width, botH, bp.palette, "bot");
    } else {
      const img = getImage(bp.src);
      if (img.complete && img.naturalWidth > 0) {
        drawImageStack(ctx, img, o.x, 0, o.width, topH, bp.brickHeight, "top");
        drawImageStack(ctx, img, o.x, botY, o.width, botH, bp.brickHeight, "bot");
      } else {
        // fallback while loading: solid bar in current theme's near-bar color
        ctx.fillStyle = "#ffcc00";
        ctx.fillRect(o.x, 0, o.width, topH);
        ctx.fillRect(o.x, botY, o.width, botH);
      }
    }
  }

  private drawScoreHud(): void {
    const ctx = this.ctx;
    const score = this.hooks.getScore();
    const text = pad4(score);
    const fontName = this.fontReady ? "'Jersey 10', monospace" : "monospace";
    ctx.font = `40px ${fontName}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    // letterSpacing for wide pixel look (supported in modern Chromium/Safari)
    const prevLetterSpacing = (ctx as unknown as { letterSpacing?: string })
      .letterSpacing;
    (ctx as unknown as { letterSpacing?: string }).letterSpacing = "2px";
    ctx.fillStyle = "#0a0f1c";
    ctx.fillText(text, 9, 9);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, 8, 8);
    if (prevLetterSpacing !== undefined) {
      (ctx as unknown as { letterSpacing?: string }).letterSpacing =
        prevLetterSpacing;
    }
  }

  private drawIdleOverlay(): void {
    const best = this.hooks.getBest();
    const lines: Line[] = [
      { text: "PRESS ▶ TO PLAY", size: 28, color: "#e8ecff" },
    ];
    if (best > 0) {
      lines.push({ text: `HI  ${pad4(best)}`, size: 18, color: "#8aa0ff" });
    }
    this.drawCenteredStack(lines, PLAY_H / 2 + 40);
  }

  private drawGameOverOverlay(): void {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(10,15,28,0.55)";
    ctx.fillRect(0, 0, PLAY_W, PLAY_H);

    const score = this.hooks.getScore();
    const best = this.hooks.getBest();
    const newBest = score > 0 && score >= best;
    const lines: Line[] = [
      { text: "GAME OVER", size: 36, color: "#ff7a8a" },
      { text: `SCORE ${pad4(score)}`, size: 24, color: "#ffffff" },
      { text: `BEST  ${pad4(best)}`, size: 20, color: newBest ? "#ffd36e" : "#8aa0ff" },
      { text: `TIME  ${mmss(this.elapsed)}`, size: 16, color: "#8aa0ff" },
      { text: "", size: 8, color: "#ffffff" },
      { text: "♥ TO RESTART", size: 16, color: "#ff9aa8" },
    ];
    this.drawCenteredStack(lines);
  }

  private drawWonOverlay(ts: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(10, 15, 28, 0.55)";
    ctx.fillRect(0, 0, PLAY_W, PLAY_H);

    const step = this.hooks.getShareStep();

    if (step === "prompt") {
      // Header
      this.drawCenteredStack(
        [{ text: "SHARE SCREENSHOT", size: 26, color: "#ffd36e" }],
        PLAY_H / 2 - 40,
      );
      // YES / NO with blinking arrow before YES
      this.drawChoicePrompt(ts, PLAY_H / 2 + 4, 24, "YES", "NO");
      // Footer hint
      ctx.font = `12px ${this.fontFamily()}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#8aa0ff";
      ctx.fillText("press any button", PLAY_W / 2, PLAY_H - 28);
      return;
    }

    // intro + done show the winning screen
    const score = this.hooks.getScore();
    const best = this.hooks.getBest();
    const newBest = score > 0 && score >= best;
    this.drawCenteredStack(
      [
        { text: "YOU WON!", size: 36, color: "#ffd36e" },
        { text: "SHARE WITH FRIENDS", size: 16, color: "#ffffff" },
        { text: "", size: 4, color: "#ffffff" },
        { text: `SCORE ${pad4(score)}`, size: 14, color: newBest ? "#ffd36e" : "#8aa0ff" },
        { text: `TIME  ${mmss(this.elapsed)}`, size: 12, color: "#8aa0ff" },
      ],
      PLAY_H / 2 - 24,
    );

    // Blinking "▸ SHARE" button below, only on intro (done stays static).
    if (step === "intro") {
      this.drawBlinkingButton(ts, PLAY_H - 42, 22, "SHARE");
    }
  }

  private fontFamily(): string {
    return this.fontReady ? "'Jersey 10', monospace" : "monospace";
  }

  private drawChoicePrompt(
    ts: number,
    y: number,
    size: number,
    yesLabel: string,
    noLabel: string,
  ): void {
    const ctx = this.ctx;
    ctx.font = `${size}px ${this.fontFamily()}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    const spacing = Math.round(size * 1.3);
    const yesW = ctx.measureText(yesLabel).width;
    const noW = ctx.measureText(noLabel).width;
    const totalW = yesW + spacing + noW;
    const startX = Math.round(PLAY_W / 2 - totalW / 2);
    const yi = Math.round(y);

    // shadows
    ctx.fillStyle = "rgba(10,15,28,0.9)";
    ctx.fillText(yesLabel, startX + 1, yi + 1);
    ctx.fillText(noLabel, startX + yesW + spacing + 1, yi + 1);
    // YES bright, NO dim
    ctx.fillStyle = "#ffffff";
    ctx.fillText(yesLabel, startX, yi);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText(noLabel, startX + yesW + spacing, yi);

    // blinking arrow to the left of YES
    if (blinkOn(ts)) {
      const arrow = "▸";
      const gap = 6;
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(10,15,28,0.9)";
      ctx.fillText(arrow, startX - gap + 1, yi + 1);
      ctx.fillStyle = "#ffd36e";
      ctx.fillText(arrow, startX - gap, yi);
    }
  }

  private drawBlinkingButton(
    ts: number,
    y: number,
    size: number,
    label: string,
  ): void {
    const ctx = this.ctx;
    ctx.font = `${size}px ${this.fontFamily()}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    const labelW = ctx.measureText(label).width;
    const startX = Math.round(PLAY_W / 2 - labelW / 2);
    const yi = Math.round(y);

    ctx.fillStyle = "rgba(10,15,28,0.9)";
    ctx.fillText(label, startX + 1, yi + 1);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, startX, yi);

    if (blinkOn(ts)) {
      const arrow = "▸";
      const gap = 6;
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(10,15,28,0.9)";
      ctx.fillText(arrow, startX - gap + 1, yi + 1);
      ctx.fillStyle = "#ffd36e";
      ctx.fillText(arrow, startX - gap, yi);
    }
  }

  private drawCenteredStack(lines: Line[], anchorY: number = PLAY_H / 2): void {
    const ctx = this.ctx;
    const fontName = this.fontReady ? "'Jersey 10', monospace" : "monospace";
    const gap = 2;
    let totalH = 0;
    for (const L of lines) totalH += L.size + gap;
    totalH -= gap;

    let y = anchorY - totalH / 2;
    ctx.textBaseline = "top";
    ctx.textAlign = "center";
    const cx = Math.floor(PLAY_W / 2);
    for (const L of lines) {
      ctx.font = `${L.size}px ${fontName}`;
      ctx.fillStyle = "rgba(10,15,28,0.9)";
      ctx.fillText(L.text, cx + 1, Math.floor(y) + 1);
      ctx.fillStyle = L.color;
      ctx.fillText(L.text, cx, Math.floor(y));
      y += L.size + gap;
    }
  }
}

function drawPipe(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  p: PipePalette,
  side: "top" | "bot",
): void {
  if (h <= 0) return;
  ctx.fillStyle = p.body;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = p.shadow;
  ctx.fillRect(x + w - 4, y, 4, h);
  ctx.fillStyle = p.highlight;
  ctx.fillRect(x, y, 2, h);
  ctx.fillStyle = p.outline;
  ctx.fillRect(x, y, w, 1);
  ctx.fillRect(x, y + h - 1, w, 1);
  ctx.fillRect(x, y, 1, h);
  ctx.fillRect(x + w - 1, y, 1, h);
  const capH = 6;
  const capY = side === "top" ? y + h - capH : y;
  ctx.fillStyle = p.cap;
  ctx.fillRect(x - 2, capY, w + 4, capH);
  ctx.fillStyle = p.outline;
  ctx.fillRect(x - 2, capY, w + 4, 1);
  ctx.fillRect(x - 2, capY + capH - 1, w + 4, 1);
  ctx.fillRect(x - 2, capY, 1, capH);
  ctx.fillRect(x + w + 1, capY, 1, capH);
}

function drawImageStack(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  brickH: number,
  side: "top" | "bot",
): void {
  if (h <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const bricks = Math.ceil(h / brickH) + 1;
  for (let i = 0; i < bricks; i++) {
    const by =
      side === "top"
        ? y + h - (i + 1) * brickH
        : y + i * brickH;
    ctx.drawImage(img, x, by, w, brickH);
  }
  ctx.restore();
}
