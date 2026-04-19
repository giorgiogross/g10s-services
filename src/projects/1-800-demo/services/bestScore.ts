const KEY = "1-800-demo:best";

export function getBest(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw == null) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function setBest(v: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, String(Math.floor(v)));
  } catch {
    // ignore (private mode, etc.)
  }
}
