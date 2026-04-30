import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const STRIP_H = 15;
const MIN_W = 25;
const MAX_W = 55;
const DISSOLVE_BAND = 0.45;

interface Tile {
  x: number;
  y: number;
  w: number;
  delay: number;
  speed: number;
}

function buildTiles(w: number, h: number): Tile[] {
  const rows = Math.ceil(h / STRIP_H);
  const out: Tile[] = [];
  for (let r = 0; r < rows; r++) {
    const y = r * STRIP_H;
    let x = 0;
    while (x < w) {
      const remaining = w - x;
      const tileW =
        remaining <= MAX_W
          ? remaining
          : MIN_W + Math.random() * (MAX_W - MIN_W);
      out.push({
        x,
        y,
        w: tileW,
        delay: Math.random() * 0.6,
        speed: 0.4 + Math.random() * 2.1,
      });
      x += tileW;
    }
  }
  return out;
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cw: number,
  ch: number,
) {
  const ir = img.naturalWidth / img.naturalHeight;
  const cr = cw / ch;
  let dw: number, dh: number, dx: number, dy: number;
  if (ir > cr) {
    dh = ch;
    dw = ch * ir;
    dx = (cw - dw) / 2;
    dy = 0;
  } else {
    dw = cw;
    dh = cw / ir;
    dx = 0;
    dy = 0;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}

const SEGMENTS = [
  {
    heading: "Get trusted by any lender and Susu, instantly.",
    body: "Cirali builds your portable trust history. Every saving and every repaid loan builds your record.",
  },
  {
    heading: "Your money grows.",
    body: "Your Susu's savings earn a return. When you withdraw, your money has kept up with rising prices.",
  },
  {
    heading: "Lend and borrow on your terms.",
    body: "Your record lets you offer loans too. Cirali is not a bank, it's a platform that enables people to see each other's track record.",
  },
];

const TOTAL_CHARS = SEGMENTS.reduce(
  (s, seg) => s + seg.heading.length + seg.body.length,
  0,
);

function getRevealCounts(revealed: number) {
  let rem = revealed;
  return SEGMENTS.map((seg) => {
    const hr = Math.min(rem, seg.heading.length);
    rem = Math.max(0, rem - seg.heading.length);
    const br = Math.min(rem, seg.body.length);
    rem = Math.max(0, rem - seg.body.length);
    return { hr, br };
  });
}

function getCursorPos(revealed: number) {
  let rem = revealed;
  for (let i = 0; i < SEGMENTS.length; i++) {
    if (rem < SEGMENTS[i].heading.length)
      return { seg: i, field: "h" as const };
    rem -= SEGMENTS[i].heading.length;
    if (rem < SEGMENTS[i].body.length)
      return { seg: i, field: "b" as const };
    rem -= SEGMENTS[i].body.length;
  }
  return null;
}

const PHONE_IMAGES = [
  "/cirali/phone-join-susu.webp",
  "/cirali/phone-credit-card.webp",
  "/cirali/phone-coins.webp",
  "/cirali/phone-loan-hands.webp",
];

const HOW_STEPS = [
  {
    title: "Keep saving with your Susu.",
    body: "Nothing changes about your susu. Cirali sits underneath.",
  },
  {
    title: "Every payment builds your record.",
    body: "You write your own credit history. Use it to build trust with anyone.",
  },
  {
    title: "Your Susu's savings earn a return.",
    body: "When it's your turn, there's more coming back.",
  },
  {
    title: "Your name opens doors.",
    body: "Need a bigger loan? Want to join a new group? Your record speaks for you.",
  },
];

const KENTE_COLORS = [
  "#C8A951", "#D4A42A", "#E8C84A",
  "#1B6B3A", "#2D8B55", "#0F4D2A",
  "#C85A2A", "#E07040", "#A04420",
  "#8B4513", "#6B3410", "#A0522D",
  "#D4AF37", "#B8860B", "#DAA520",
  "#1A3C2A", "#2E5E3F", "#0A2618",
];

const SKIN_TONES = [
  "#3B2210", "#4A2E15", "#5C3A1E", "#6B4226",
  "#7A4F30", "#8B5E3A", "#9C6D44", "#2E1A0E",
  "#1C1008", "#4E3220", "#694B35", "#3A2415",
];

const BAR_W = 15;
const TOP_H = 50;

interface BarData {
  color: string;
  skinColor: string;
  baseHeight: number;
  amplitude: number;
  speed: number;
  phase: number;
}

function buildBars(screenW: number, sectionH: number): BarData[] {
  const count = Math.ceil(screenW / BAR_W);
  const bars: BarData[] = [];
  for (let i = 0; i < count; i++) {
    bars.push({
      color: KENTE_COLORS[Math.floor(Math.random() * KENTE_COLORS.length)],
      skinColor: SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)],
      baseHeight: sectionH * (0.22 + Math.random() * 0.09),
      amplitude: 10 + Math.random() * 30,
      speed: 0.3 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return bars;
}

function KenteBars() {
  const containerRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<BarData[]>([]);
  const rafRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const section = container.parentElement!;
    const barEls: HTMLDivElement[] = [];

    const create = () => {
      const sectionH = section.offsetHeight;
      const screenW = window.innerWidth;
      barsRef.current = buildBars(screenW, sectionH);
      container.innerHTML = "";
      barEls.length = 0;
      barsRef.current.forEach((bar, i) => {
        const wrapper = document.createElement("div");
        wrapper.style.cssText = `position:absolute;bottom:0;width:${BAR_W}px;left:${i * BAR_W}px;display:flex;flex-direction:column;align-items:stretch;height:${bar.baseHeight}px;`;
        const top = document.createElement("div");
        top.style.cssText = `width:100%;height:${TOP_H}px;background:${bar.skinColor};flex-shrink:0;`;
        const colorBar = document.createElement("div");
        colorBar.style.cssText = `width:100%;flex:1;background:${bar.color};`;
        wrapper.appendChild(top);
        wrapper.appendChild(colorBar);
        container.appendChild(wrapper);
        barEls.push(wrapper);
      });
    };

    create();

    let t = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      t += dt;
      for (let i = 0; i < barEls.length; i++) {
        const bar = barsRef.current[i];
        const osc = Math.sin(t * bar.speed + bar.phase);
        const eased = osc * 0.5 + 0.5;
        const h = bar.baseHeight + bar.amplitude * eased;
        barEls[i].style.height = h + "px";
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    const onResize = () => { create(); };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}

const CLIP_FRACTION = 0.18;

function getPhoneTarget() {
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const phoneH = vh * 0.50;
  const phoneW = phoneH * 9 / 16;
  const phoneTop = vh * 0.28;
  let phoneLeft: number;
  if (vw >= 1000) {
    phoneLeft = vw * 0.35 - phoneW / 2;
  } else {
    phoneLeft = vw * 0.33 - phoneW;
  }
  return { phoneH, phoneW, phoneTop, phoneLeft };
}

export default function AppCirali() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgWrapRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const twRef = useRef<HTMLDivElement>(null);
  const twShiftRef = useRef<HTMLDivElement>(null);
  const howRef = useRef<HTMLDivElement>(null);
  const navCtaRef = useRef<HTMLAnchorElement>(null);
  const heroOverlayRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(0);
  const [stepProgress, setStepProgress] = useState(-1);

  const cst = useRef({
    tapestry: null as HTMLImageElement | null,
    offscreen: null as OffscreenCanvas | null,
    tiles: [] as Tile[],
    progress: 0,
    w: 0,
    h: 0,
    dpr: 1,
    raf: 0,
  });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const s = cst.current;
    if (!canvas || !s.tapestry) return;

    const ctx = canvas.getContext("2d")!;
    const { w, h, dpr, progress, tiles, offscreen } = s;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (progress >= 1) return;

    if (progress <= 0) {
      drawCover(ctx, s.tapestry, w, h);
      return;
    }

    if (!offscreen) return;
    const off = offscreen.getContext("2d")!;
    off.setTransform(dpr, 0, 0, dpr, 0, 0);
    off.clearRect(0, 0, w, h);
    drawCover(off, s.tapestry, w, h);

    const band = h * DISSOLVE_BAND;
    const sweep = h + band;
    const wTop = h - sweep * progress;

    off.globalCompositeOperation = "destination-out";
    off.fillStyle = "#000";
    for (const tile of tiles) {
      const raw = (tile.y - wTop) / band;
      const adj = (raw - tile.delay) / (1 - tile.delay);
      const tp = Math.max(0, Math.min(1, adj));
      if (tp <= 0) continue;
      off.fillRect(tile.x, tile.y, tile.w * (tp ** tile.speed), STRIP_H);
    }
    off.globalCompositeOperation = "source-over";

    ctx.drawImage(offscreen, 0, 0, w, h);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const scroller = scrollRef.current;
    const twSection = twRef.current;
    const twShift = twShiftRef.current;
    const grid = gridRef.current;
    const howSection = howRef.current;
    const phoneCont = phoneRef.current;
    const imgWrap = imgWrapRef.current;
    if (
      !canvas || !scroller || !twSection || !twShift || !grid ||
      !howSection || !phoneCont || !imgWrap
    ) return;

    const positionPhone = () => {
      const { phoneH, phoneW, phoneTop, phoneLeft } = getPhoneTarget();
      phoneCont.style.top = phoneTop + "px";
      phoneCont.style.left = phoneLeft + "px";
      phoneCont.style.width = phoneW + "px";
      phoneCont.style.height = phoneH + "px";
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      const offscreen = new OffscreenCanvas(w * dpr, h * dpr);
      Object.assign(cst.current, {
        w,
        h,
        dpr,
        offscreen,
        tiles: buildTiles(w, h),
      });
      draw();
      positionPhone();
      centerGrid();
    };

    const tapestry = new Image();
    tapestry.onload = () => {
      cst.current.tapestry = tapestry;
      resize();
    };
    tapestry.src = "/cirali/hero-tapestry.webp";

    const overlay = heroOverlayRef.current;

    const stDissolve = ScrollTrigger.create({
      trigger: twSection,
      scroller,
      start: "top bottom",
      end: "top top",
      onUpdate: (self) => {
        cst.current.progress = self.progress;
        cancelAnimationFrame(cst.current.raf);
        cst.current.raf = requestAnimationFrame(draw);
        if (overlay) {
          const fadeP = Math.min(1, self.progress / 0.5);
          overlay.style.opacity = String(1 - fadeP);
        }
      },
    });

    const stTypewriter = ScrollTrigger.create({
      trigger: twSection,
      scroller,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        const n = Math.floor(self.progress * TOTAL_CHARS);
        setRevealed((prev) => (prev === n ? prev : n));
      },
    });

    const tweenShift = gsap.to(twShift, {
      y: -200,
      ease: "none",
      scrollTrigger: {
        trigger: twSection,
        scroller,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
      },
    });

    const centerGrid = () => {
      if (grid.offsetHeight > 0) {
        grid.style.marginTop = -grid.offsetHeight / 2 + "px";
      }
    };
    const gridImg = grid.querySelector("img");
    if (gridImg && gridImg.complete) {
      centerGrid();
    } else if (gridImg) {
      gridImg.addEventListener("load", centerGrid);
    }

    gsap.set(grid, { rotation: 0 });
    const onScroll = () => {
      const maxScroll = scroller.scrollHeight - scroller.clientHeight;
      if (maxScroll <= 0) return;
      const p = scroller.scrollTop / maxScroll;
      gsap.set(grid, { rotation: p * 15 });

      const howBottom = howSection.offsetTop + howSection.offsetHeight;
      const scrollBottom = scroller.scrollTop + scroller.clientHeight;
      if (scrollBottom > howBottom) {
        imgWrap.style.transform = `translateY(${-(scrollBottom - howBottom)}px)`;
      } else {
        imgWrap.style.transform = "translateY(0)";
      }
    };
    scroller.addEventListener("scroll", onScroll);

    const navBtn = navCtaRef.current;

    const stHow = ScrollTrigger.create({
      trigger: howSection,
      scroller,
      start: "top top",
      end: "bottom bottom",
      onEnter: () => {
        if (navBtn) {
          navBtn.style.color = "#1a1a1a";
          navBtn.style.borderColor = "rgba(0,0,0,0.25)";
        }
      },
      onLeaveBack: () => {
        if (navBtn) {
          navBtn.style.color = "#ffffff";
          navBtn.style.borderColor = "rgba(255,255,255,0.5)";
        }
        imgWrap.style.clipPath = "inset(0)";
        imgWrap.style.transform = "translateY(0)";
        grid.style.opacity = "1";
        const phones = phoneCont.children as HTMLCollectionOf<HTMLElement>;
        for (let i = 0; i < phones.length; i++) phones[i].style.opacity = "0";
        setStepProgress(-1);
      },
      onUpdate: (self) => {
        const p = self.progress;
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        const { phoneH, phoneW, phoneTop, phoneLeft } = getPhoneTarget();

        const clipP = Math.min(1, p / CLIP_FRACTION);
        const e = clipP * clipP * (3 - 2 * clipP);

        const top = e * phoneTop;
        const right = e * (vw - phoneLeft - phoneW);
        const bottom = e * (vh - phoneTop - phoneH);
        const left = e * Math.max(0, phoneLeft);
        const round = e * 24;
        imgWrap.style.clipPath =
          `inset(${top}px ${right}px ${bottom}px ${left}px round ${round}px)`;

        const fadeOutStart = CLIP_FRACTION;
        const fadeOutEnd = CLIP_FRACTION + 0.08;
        const gridFade = 1 - Math.min(1, Math.max(0, (p - fadeOutStart) / (fadeOutEnd - fadeOutStart)));
        grid.style.opacity = String(gridFade);

        const phones = phoneCont.children as HTMLCollectionOf<HTMLElement>;
        const stepsP = Math.max(0, (p - CLIP_FRACTION) / (1 - CLIP_FRACTION));

        for (let i = 0; i < phones.length; i++) {
          const segStart = CLIP_FRACTION + (i * (1 - CLIP_FRACTION)) / 4;
          const fadeRange = 0.05;
          const fadeIn = Math.min(1, Math.max(0, (p - segStart) / fadeRange));
          if (i === 0) {
            phones[i].style.opacity = String(Math.max(e, fadeIn));
          } else {
            phones[i].style.opacity = String(fadeIn);
          }
        }

        const dwellStart = 0.12;
        const dwellEnd = 0.12;
        const scrollZone = Math.max(0, Math.min(1,
          (stepsP - dwellStart) / (1 - dwellStart - dwellEnd)
        ));
        const entrance = Math.min(1, p / CLIP_FRACTION);
        const continuous = entrance < 1 ? -1 + entrance : scrollZone * 3;
        setStepProgress(continuous);
      },
    });

    window.addEventListener("resize", resize);
    return () => {
      stDissolve.kill();
      stTypewriter.kill();
      tweenShift.scrollTrigger?.kill();
      tweenShift.kill();
      stHow.kill();
      scroller.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(cst.current.raf);
      window.removeEventListener("resize", resize);
    };
  }, [draw]);

  const counts = getRevealCounts(revealed);
  const cursor = getCursorPos(revealed);

  return (
    <>
      <a ref={navCtaRef} href="https://www.instagram.com/tobylovesicecream/" target="_blank" rel="noreferrer noopener" style={navCta} className="cirali-cta cirali-nav-cta">Join Waitlist</a>

      <div ref={imgWrapRef} style={imgLayer}>
        <div ref={gridRef} style={imgGrid}>
          {Array.from({ length: 9 }, (_, i) => (
            <img
              key={i}
              src="/cirali/circle-dance.webp"
              alt=""
              style={imgTile}
            />
          ))}
        </div>
        <div ref={phoneRef} style={phoneFrame}>
          {PHONE_IMAGES.map((src, i) => (
            <img key={i} src={src} alt="" style={phoneImg} />
          ))}
        </div>
      </div>

      <style>{`
        .cirali-cta:hover {
          background: #1a1a1a !important;
          color: #ffffff !important;
          border-color: #1a1a1a !important;
        }
        @media (min-width: 768px) {
          .cirali-hero-content {
            text-align: left !important;
            max-width: 560px !important;
            align-self: flex-end !important;
            margin-right: auto !important;
            margin-left: 0 !important;
            padding-left: clamp(48px, 8vw, 120px) !important;
          }
        }
        @media (max-width: 767px) {
          .cirali-nav-cta {
            top: auto !important;
            right: auto !important;
            bottom: 24px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
          }
        }
        @media (max-width: 999px) {
          .cirali-how-layout {
            gap: 0 !important;
          }
          .cirali-how-left {
            flex: 0 0 33.3% !important;
            min-width: 0 !important;
          }
          .cirali-how-right {
            flex: 0 0 66.7% !important;
            padding-left: 20px !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      <canvas ref={canvasRef} style={canvasStyle} />

      <div ref={scrollRef} style={scrollContainer}>
        <div style={heroPanel}>
          <div ref={heroOverlayRef} style={heroGradient} />
          <div style={panelBottomContent} className="cirali-hero-content">
            <h1 style={headline}>Finance, how you wanted it to be</h1>
            <p style={subtext}>
              Cirali helps you get loans from other Susu's and private lenders, access money when life takes a bad turn, and earns you returns for your Susu.
            </p>
          </div>
        </div>

        <div ref={twRef} style={twSection}>
          <div style={twSticky}>
            <div ref={twShiftRef} style={twContent}>
              {SEGMENTS.map((seg, i) => {
                const { hr, br } = counts[i];
                const cH = cursor?.seg === i && cursor.field === "h";
                const cB = cursor?.seg === i && cursor.field === "b";
                const started = hr > 0;
                return (
                  <div
                    key={i}
                    style={{
                      ...twCard,
                      opacity: started ? 1 : 0,
                      transform: started ? "translateY(0)" : "translateY(12px)",
                      transition: "opacity 0.5s ease, transform 0.5s ease",
                    }}
                  >
                    <h3 style={twHeading}>
                      {seg.heading.substring(0, hr)}
                      {cH && <span style={cursorEl}>_</span>}
                      <span style={hiddenText}>
                        {seg.heading.substring(hr)}
                      </span>
                    </h3>
                    <p style={twBody}>
                      {seg.body.substring(0, br)}
                      {cB && <span style={cursorEl}>_</span>}
                      <span style={hiddenText}>
                        {seg.body.substring(br)}
                      </span>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div ref={howRef} style={howSection}>
          <div style={howSticky}>
            <h2 style={howTitle}>How it works</h2>
            <div style={howLayout} className="cirali-how-layout">
              <div style={howLeft} className="cirali-how-left" />
              <div style={howRight} className="cirali-how-right">
                <div style={{
                  ...howStepTrack,
                  paddingTop: "calc(41vh - 40px)",
                  transform: `translateY(${stepProgress < 0
                    ? 80 * Math.abs(stepProgress)
                    : -stepProgress * 120}px)`,
                  opacity: stepProgress < 0 ? 1 - Math.abs(stepProgress) : 1,
                }}>
                  {HOW_STEPS.map((s, i) => {
                    const nearest = Math.round(Math.max(0, Math.min(3, stepProgress)));
                    const active = stepProgress >= 0 && i === nearest;
                    return (
                      <div
                        key={i}
                        style={{
                          ...howStep,
                          opacity: active ? 1 : 0.25,
                          transition: "opacity 0.3s ease",
                        }}
                      >
                        <div style={howNumCircle}>
                          <span style={howNumText}>{i + 1}</span>
                        </div>
                        <div>
                          <p style={howStepTitle}>{s.title}</p>
                          <p style={howStepBody}>{s.body}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={diffSection}>
          <KenteBars />
          <div style={diffCenter}>
            <h2 style={diffHeading}>
              Cirali is finance, built and controlled by people like you.
            </h2>
            <p style={diffBody}>
              Your Susu is what you trust. Cirali is not a replacement for that.
              Instead, it gives your Susu the power to stand up against explotative banks
              and unpredictable financial markets. We do so by giving you a portable trust history,
              earning you returns on your Susu's pooled savings, and holds both the lenders
              and lendees accountable.
            </p>
            <a href="https://www.instagram.com/tobylovesicecream/" target="_blank" rel="noreferrer noopener" style={ctaButton} className="cirali-cta">Join Waitlist</a>
          </div>
          <footer style={footerInner}>
            <a href="/" style={backLink}>
              ← g10s
            </a>
          </footer>
        </div>
      </div>
    </>
  );
}

const imgLayer: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 0,
  pointerEvents: "none",
  overflow: "hidden",
};

const imgGrid: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  marginLeft: "-150vw",
  display: "grid",
  gridTemplateColumns: "repeat(3, 100vw)",
  width: "300vw",
  transformOrigin: "center center",
  zIndex: 1,
};

const imgTile: React.CSSProperties = {
  display: "block",
  width: "100%",
  height: "auto",
};

const phoneFrame: React.CSSProperties = {
  position: "absolute",
  overflow: "hidden",
  borderRadius: 24,
};

const phoneImg: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  opacity: 0,
};

const canvasStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  zIndex: 1,
  pointerEvents: "none",
};

const scrollContainer: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 2,
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
  fontFamily: "'Space Grotesk', system-ui, sans-serif",
  color: "#2d2419",
};

const heroPanel: React.CSSProperties = {
  position: "relative",
  height: "100vh",
  display: "flex",
  justifyContent: "center",
};

const heroGradient: React.CSSProperties = {
  position: "fixed",
  bottom: 0,
  left: 0,
  width: "100%",
  height: "50vh",
  background: "linear-gradient(to top, rgba(0,0,0,0.25) 0%, transparent 100%)",
  pointerEvents: "none",
  zIndex: 3,
};

const panelBottomContent: React.CSSProperties = {
  maxWidth: 720,
  width: "100%",
  textAlign: "center",
  padding: "0 24px clamp(60px, 12vh, 140px)",
  alignSelf: "flex-end",
};

const twSection: React.CSSProperties = {
  position: "relative",
  height: "400vh",
};

const twSticky: React.CSSProperties = {
  position: "sticky",
  top: 0,
  height: "100vh",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  paddingTop: "45vh",
  paddingLeft: 24,
  paddingRight: 24,
  boxSizing: "border-box",
};

const twContent: React.CSSProperties = {
  maxWidth: 420,
  width: "100%",
};

const twCard: React.CSSProperties = {
  marginBottom: 20,
  padding: "20px 24px",
  borderRadius: 16,
  background: "rgba(255, 255, 255, 0.25)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255, 255, 255, 0.3)",
  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.06)",
};

const twHeading: React.CSSProperties = {
  fontFamily: "'Titan One', cursive",
  fontSize: "clamp(1.2rem, 3.5vw, 1.6rem)",
  fontWeight: 400,
  lineHeight: 1.3,
  margin: "0 0 6px",
  color: "#1a1a1a",
  textAlign: "left",
};

const twBody: React.CSSProperties = {
  fontSize: "1rem",
  lineHeight: 1.7,
  margin: 0,
  color: "#2d2d2d",
  textAlign: "left",
};

const cursorEl: React.CSSProperties = {
  color: "#1a1a1a",
  fontWeight: 700,
};

const hiddenText: React.CSSProperties = {
  color: "transparent",
};

const headline: React.CSSProperties = {
  fontFamily: "'Titan One', cursive",
  fontSize: "clamp(2rem, 6vw, 3.5rem)",
  fontWeight: 400,
  lineHeight: 1.2,
  margin: "0 0 20px",
  color: "#ffffff",
};

const subtext: React.CSSProperties = {
  fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
  fontWeight: 500,
  lineHeight: 1.65,
  color: "#ffffff",
  margin: 0,
  textShadow: "0 1px 3px rgba(0,0,0,0.15)",
};

const diffSection: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  height: "66vh",
  padding: "48px 24px",
  boxSizing: "border-box",
  background: "#ffffff",
  position: "relative",
  overflow: "hidden",
};

const diffCenter: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-end",
  flex: 1,
  paddingBottom: "18vh",
};

const diffHeading: React.CSSProperties = {
  fontFamily: "'Titan One', cursive",
  fontSize: "clamp(1.35rem, 4vw, 1.75rem)",
  fontWeight: 400,
  lineHeight: 1.3,
  margin: "0 0 16px",
  color: "#1a1a1a",
  textAlign: "center",
  maxWidth: 520,
};

const diffBody: React.CSSProperties = {
  fontSize: "1rem",
  lineHeight: 1.7,
  margin: 0,
  color: "#2d2d2d",
  textAlign: "center",
  maxWidth: 520,
};

const howSection: React.CSSProperties = {
  position: "relative",
  height: "550vh",
};

const howSticky: React.CSSProperties = {
  position: "sticky",
  top: 0,
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  padding: "clamp(48px, 8vh, 96px) 24px 0",
  boxSizing: "border-box",
};

const howTitle: React.CSSProperties = {
  fontFamily: "'Titan One', cursive",
  fontSize: "clamp(1.5rem, 4vw, 2rem)",
  fontWeight: 400,
  lineHeight: 1.2,
  margin: "0 0 clamp(16px, 3vh, 32px)",
  color: "#1a1a1a",
  textAlign: "center",
};

const howLayout: React.CSSProperties = {
  display: "flex",
  flex: 1,
  gap: 32,
};

const howLeft: React.CSSProperties = {
  flex: 1,
};

const howRight: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-start",
  overflow: "hidden",
};

const howStepTrack: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 28,
};

const howStep: React.CSSProperties = {
  display: "flex",
  gap: 16,
  alignItems: "flex-start",
};

const howNumCircle: React.CSSProperties = {
  flexShrink: 0,
  width: 44,
  height: 44,
  borderRadius: "50%",
  border: "1px solid #1a1a1a",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  alignSelf: "center",
};

const howNumText: React.CSSProperties = {
  fontFamily: "'Titan One', cursive",
  fontSize: "1.1rem",
  lineHeight: 1,
  color: "#1a1a1a",
};

const howStepTitle: React.CSSProperties = {
  fontWeight: 600,
  margin: "0 0 4px",
  color: "#1a1a1a",
  fontSize: "1rem",
  lineHeight: 1.4,
};

const howStepBody: React.CSSProperties = {
  margin: 0,
  color: "#3d3528",
  fontSize: "0.95rem",
  lineHeight: 1.6,
};

const ctaBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 28px",
  borderRadius: 12,
  border: "1px solid rgba(255, 255, 255, 0.7)",
  background: "rgba(255, 255, 255, 0.15)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  color: "#ffffff",
  fontFamily: "'Space Grotesk', system-ui, sans-serif",
  fontWeight: 700,
  fontSize: "0.95rem",
  cursor: "pointer",
  textDecoration: "none",
  transition: "color 0.3s ease, border-color 0.3s ease, background 0.3s ease",
};

const navCta: React.CSSProperties = {
  ...ctaBase,
  position: "fixed",
  top: 20,
  right: 20,
  zIndex: 10,
};

const ctaButton: React.CSSProperties = {
  ...ctaBase,
  marginTop: 32,
  border: "1px solid rgba(0, 0, 0, 0.2)",
  color: "#1a1a1a",
  background: "rgba(255, 255, 255, 0.35)",
};

const footerInner: React.CSSProperties = {
  marginTop: "auto",
  paddingBottom: 32,
  textAlign: "center",
};

const backLink: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "#8b5e1a",
  textDecoration: "none",
};
