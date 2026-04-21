import { useCallback, useEffect, useRef, useState } from "react";
import { Device } from "./components/Device";
import { GameCanvas, type GameCanvasHandle } from "./components/GameCanvas";
import { SourcesPanel } from "./components/SourcesPanel";
import { TabBar } from "./components/TabBar";
import { YouTubeEmbed } from "./components/YouTubeEmbed";
import { useYouTubePlayer } from "./hooks/useYouTubePlayer";
import { compose, share } from "./services/share";
import { use1800DemoStore } from "./store/1-800-demo-store";
import "./styles.css";

const YOUTUBE_VIDEO_ID = "C4P0PiJVUvU";
const YOUTUBE_VIDEO_URL = `https://www.youtube.com/watch?v=${YOUTUBE_VIDEO_ID}`;
const SONG_TITLE = "clarence pier";
const SONG_AUTHOR = "1-800 GIRLS";
const SITE_URL =
  typeof window !== "undefined" ? window.location.origin + "/1-800-demo/" : "";

export default function App() {
  const gameRef = useRef<GameCanvasHandle>(null);
  const [flapPressed, setFlapPressed] = useState(false);
  const gameState = use1800DemoStore((s) => s.gameState);
  const shareStep = use1800DemoStore((s) => s.shareStep);
  const start = use1800DemoStore((s) => s.start);
  const reset = use1800DemoStore((s) => s.reset);
  const setTab = use1800DemoStore((s) => s.setTab);
  const setShareStep = use1800DemoStore((s) => s.setShareStep);

  const yt = useYouTubePlayer("td-yt-player", YOUTUBE_VIDEO_ID);

  // Drive YouTube off state transitions (covers engine-triggered die/win).
  useEffect(() => {
    if (gameState !== "playing") yt.pause();
  }, [gameState, yt]);

  // Captures the current game canvas + device + song link into a single
  // screenshot and invokes the native share sheet (or falls back to download).
  const captureAndShare = useCallback(async () => {
    const canvas = document.querySelector<HTMLCanvasElement>(".td-canvas");
    if (!canvas) {
      setShareStep("done");
      return;
    }
    // Yield two frames so the engine has painted the win overlay
    // (not the 'prompt' overlay) before we snapshot it.
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
    try {
      const blob = await compose({ gameCanvas: canvas, songTitle: SONG_TITLE });
      await share({
        blob,
        songTitle: SONG_TITLE,
        songAuthor: SONG_AUTHOR,
        videoUrl: YOUTUBE_VIDEO_URL,
        siteUrl: SITE_URL,
      });
    } catch (err) {
      console.error("share failed", err);
    } finally {
      setShareStep("done");
    }
  }, [setShareStep]);

  // Central advance used by play-button, heart-button, and spacebar during
  // the won state. Returns true if handled.
  const advanceWonFlow = useCallback((): boolean => {
    const s = use1800DemoStore.getState();
    if (s.gameState !== "won") return false;
    if (s.shareStep === "intro") {
      setShareStep("prompt");
    } else if (s.shareStep === "prompt") {
      // Flip back to the win screen visually, THEN capture.
      setShareStep("intro");
      void captureAndShare();
    } else {
      // 'done' → reset for a new run.
      reset();
      yt.pause();
    }
    return true;
  }, [setShareStep, captureAndShare, reset, yt]);

  const handlePlayDown = useCallback(() => {
    setFlapPressed(true);
    if (advanceWonFlow()) {
      gameRef.current?.setFlapHold(true);
      setTab("play");
      return;
    }
    const state = use1800DemoStore.getState().gameState;
    if (state === "playing") {
      gameRef.current?.flap();
    } else {
      start();
      yt.restart();
    }
    gameRef.current?.setFlapHold(true);
    setTab("play");
  }, [advanceWonFlow, start, setTab, yt]);

  const handlePlayUp = useCallback(() => {
    setFlapPressed(false);
    gameRef.current?.setFlapHold(false);
  }, []);

  const handleHeartDown = useCallback(() => {
    if (advanceWonFlow()) return;
    reset();
    yt.pause();
    gameRef.current?.setFlapHold(false);
  }, [advanceWonFlow, reset, yt]);

  useEffect(() => {
    const isFlapKey = (e: KeyboardEvent) =>
      e.code === "Space" || e.code === "ArrowUp";

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isFlapKey(e)) return;
      if (e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      handlePlayDown();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!isFlapKey(e)) return;
      handlePlayUp();
    };
    const onBlur = () => handlePlayUp();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [handlePlayDown, handlePlayUp]);

  return (
    <>
      <a href="/" className="td-logo-link" aria-label="g10s home">
        <img src="/g10s_logo_pixels_bold.svg" alt="g10s" className="td-logo" />
      </a>
      <main className="td-app">
        <YouTubeEmbed />
        <Device
          pressed={flapPressed}
          onPlayDown={handlePlayDown}
          onPlayUp={handlePlayUp}
          onHeartDown={handleHeartDown}
        >
          <GameCanvas ref={gameRef} />
        </Device>
        <p className="td-disclaimer">
          DISCLAIMER: this is a case study, not an official collaboration with
          the artist
        </p>
        <a
          href={YOUTUBE_VIDEO_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="td-song-link"
        >
          Listen to {SONG_TITLE}
        </a>
      </main>
      <SourcesPanel />
      <TabBar />
      {/* Ensure re-render on shareStep change so the engine's getShareStep
          reads the latest value right after a button press */}
      <span hidden aria-hidden="true">
        {shareStep}
      </span>
    </>
  );
}
