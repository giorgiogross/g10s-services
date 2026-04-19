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
  mute?: () => void;
  unMute?: () => void;
  seekTo?: (seconds: number, allowSeekAhead: boolean) => void;
  destroy?: () => void;
  getPlayerState?: () => number;
}

export interface YouTubeApi {
  play: () => void;
  pause: () => void;
  restart: () => void;
}

const TAG = "[yt]";

export function useYouTubePlayer(
  elementId: string,
  videoId: string,
): YouTubeApi {
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const queuedRef = useRef<Array<() => void>>([]);

  const apiRef = useRef<YouTubeApi | null>(null);
  if (!apiRef.current) {
    const runOrQueue = (name: string, fn: () => void) => {
      const p = playerRef.current;
      const r = readyRef.current;
      console.log(TAG, name, "called", { hasPlayer: !!p, ready: r });
      if (p && r) {
        fn();
      } else {
        queuedRef.current.push(fn);
      }
    };
    apiRef.current = {
      play: () =>
        runOrQueue("play", () => {
          console.log(TAG, "-> playVideo()");
          playerRef.current?.playVideo?.();
        }),
      pause: () =>
        runOrQueue("pause", () => {
          console.log(TAG, "-> pauseVideo()");
          playerRef.current?.pauseVideo?.();
        }),
      restart: () =>
        runOrQueue("restart", () => {
          console.log(TAG, "-> seekTo(0) + playVideo()");
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
      if (!el) {
        console.log(TAG, "element missing:", elementId);
        return;
      }
      console.log(TAG, "creating YT.Player", { elementId, videoId });
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
            console.log(TAG, "onReady fired. Flushing queue:", queuedRef.current.length);
            for (const cmd of queuedRef.current) cmd();
            queuedRef.current = [];
          },
          onStateChange: (e) => {
            const state = (e as { data?: number })?.data;
            console.log(TAG, "state change:", state, "(-1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued)");
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
