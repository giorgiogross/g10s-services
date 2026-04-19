// Screenshot composition + native-share fallback.
//
// Composite layout (output canvas):
//   ┌────────────────────────────┐
//   │        gradient bg         │  (matches app)
//   │                            │
//   │   ┌────────────────────┐   │
//   │   │                    │   │
//   │   │   device PNG       │   │
//   │   │   + game canvas    │   │
//   │   │     (as screen)    │   │
//   │   │                    │   │
//   │   └────────────────────┘   │
//   │                            │
//   │   Listen to {song title}   │
//   └────────────────────────────┘

const DEVICE_SRC = "/1-800-demo/1-800-device-front-cropped.png";

// Screen position inside the 634×634 cropped device (see styles.css CSS vars)
const SCREEN_LEFT = 0.1798;
const SCREEN_TOP = 0.2413;
const SCREEN_W = 0.6341;
const SCREEN_H = 0.3454;

let deviceImgPromise: Promise<HTMLImageElement> | null = null;

function loadDeviceImage(): Promise<HTMLImageElement> {
  if (!deviceImgPromise) {
    deviceImgPromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = DEVICE_SRC;
    });
  }
  return deviceImgPromise;
}

export interface ShareComposition {
  gameCanvas: HTMLCanvasElement;
  songTitle: string;
  width?: number;
}

export async function compose(opts: ShareComposition): Promise<Blob> {
  const W = opts.width ?? 1080;
  const devicePadX = Math.round(W * 0.02);
  const deviceSize = W - devicePadX * 2;
  const topPad = Math.round(W * 0.04);
  const linkGap = Math.round(W * 0.035);
  const linkFontPx = Math.round(W * 0.055);
  const bottomPad = Math.round(W * 0.06);
  const H = topPad + deviceSize + linkGap + linkFontPx + bottomPad;

  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("No 2D context");

  // bg gradient — matches .td-app
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#eef1f7");
  grad.addColorStop(1, "#d9dfea");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // device
  const device = await loadDeviceImage();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(device, devicePadX, topPad, deviceSize, deviceSize);

  // game canvas content, drawn onto the device's screen rectangle
  const sx = devicePadX + SCREEN_LEFT * deviceSize;
  const sy = topPad + SCREEN_TOP * deviceSize;
  const sw = SCREEN_W * deviceSize;
  const sh = SCREEN_H * deviceSize;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(opts.gameCanvas, sx, sy, sw, sh);

  // "Listen to {song}" link text
  ctx.fillStyle = "#1a1a1a";
  ctx.font = `${linkFontPx}px "Jersey 10", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const text = `Listen to ${opts.songTitle}`;
  const textY = topPad + deviceSize + linkGap;
  ctx.fillText(text, W / 2, textY);

  return await new Promise<Blob>((resolve, reject) => {
    out.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png",
      0.95,
    );
  });
}

export interface ShareOptions {
  blob: Blob;
  songTitle: string;
  songAuthor: string | null;
  videoUrl: string;
  siteUrl: string;
}

export async function share(opts: ShareOptions): Promise<"shared" | "downloaded" | "cancelled"> {
  const filename = `1-800-demo-${slug(opts.songTitle)}.png`;
  const file = new File([opts.blob], filename, { type: "image/png" });

  const shareText = buildShareText(opts);

  // Try Web Share API with the file (mobile Safari, Chrome Android, most modern)
  const nav = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean;
    share?: (data: { files?: File[]; text?: string; url?: string; title?: string }) => Promise<void>;
  };
  if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({
        files: [file],
        text: shareText,
        url: opts.siteUrl,
        title: `I won the 1-800 arcade for ${opts.songTitle}`,
      });
      return "shared";
    } catch (err) {
      // User cancelled or share failed — fall through to download.
      if ((err as Error)?.name === "AbortError") return "cancelled";
    }
  }

  // Desktop fallback: trigger download + copy text to clipboard so user can paste.
  const a = document.createElement("a");
  const url = URL.createObjectURL(opts.blob);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);

  try {
    await navigator.clipboard?.writeText(`${shareText}\n${opts.siteUrl}`);
  } catch {
    /* clipboard blocked — user still has the image */
  }

  return "downloaded";
}

function buildShareText(opts: ShareOptions): string {
  const author = opts.songAuthor ? ` by ${opts.songAuthor}` : "";
  return (
    `I just beat the 1-800 arcade for "${opts.songTitle}"${author}!\n` +
    `Play it → ${opts.siteUrl}\n` +
    `Listen → ${opts.videoUrl}`
  );
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "screenshot";
}
