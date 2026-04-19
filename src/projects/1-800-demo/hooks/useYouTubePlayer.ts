import { useEffect, useRef } from "react";

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: string | HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: { onReady?: () => void; onStateChange?: (e: unknown) => void };
        },
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  playVideo?: () => void;
  pauseVideo?: () => void;
  stopVideo?: () => void;
  seekTo?: (seconds: number, allowSeekAhead: boolean) => void;
  destroy?: () => void;
}

export interface YouTubeApi {
  play: () => void;
  pause: () => void;
  restart: () => void;
}

export function useYouTubePlayer(
  elementId: string,
  videoId: string,
): YouTubeApi {
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const queuedRef = useRef<Array<() => void>>([]);

  // Stable API — closures read refs at call time, so they're always current.
  const apiRef = useRef<YouTubeApi | null>(null);
  if (!apiRef.current) {
    const runOrQueue = (fn: () => void) => {
      if (playerRef.current && readyRef.current) fn();
      else queuedRef.current.push(fn);
    };
    apiRef.current = {
      play: () =>
        runOrQueue(() => {
          playerRef.current?.playVideo?.();
        }),
      pause: () =>
        runOrQueue(() => {
          playerRef.current?.pauseVideo?.();
        }),
      restart: () =>
        runOrQueue(() => {
          playerRef.current?.seekTo?.(0, true);
          playerRef.current?.playVideo?.();
        }),
    };
  }

  useEffect(() => {
    let disposed = false;
    let pollId: ReturnType<typeof setInterval> | null = null;

    const createPlayer = () => {
      if (disposed || !window.YT?.Player) return;
      const el = document.getElementById(elementId);
      if (!el) return;
      playerRef.current = new window.YT.Player(elementId, {
        videoId,
        playerVars: {
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          controls: 0,
          disablekb: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (disposed) return;
            readyRef.current = true;
            for (const cmd of queuedRef.current) cmd();
            queuedRef.current = [];
          },
        },
      });
    };

    if (window.YT?.Player) {
      createPlayer();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        createPlayer();
      };
      pollId = setInterval(() => {
        if (window.YT?.Player) {
          if (pollId) {
            clearInterval(pollId);
            pollId = null;
          }
          createPlayer();
        }
      }, 250);
    }

    return () => {
      disposed = true;
      if (pollId) clearInterval(pollId);
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
      readyRef.current = false;
    };
  }, [elementId, videoId]);

  return apiRef.current;
}
