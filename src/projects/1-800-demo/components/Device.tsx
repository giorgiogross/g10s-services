import { useEffect } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";

interface Props {
  children: ReactNode;
  pressed: boolean;
  onPlayDown: () => void;
  onPlayUp: () => void;
  onHeartDown: () => void;
}

export function Device({
  children,
  pressed,
  onPlayDown,
  onPlayUp,
  onHeartDown,
}: Props) {
  const handlePlayDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onPlayDown();
  };
  const handlePlayUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onPlayUp();
  };
  const handleHeartDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onHeartDown();
  };

  // Safety net for iOS Safari: clear hold state if the pointer is released
  // anywhere on the document.
  useEffect(() => {
    const onWinPointerUp = () => onPlayUp();
    window.addEventListener("pointerup", onWinPointerUp);
    window.addEventListener("pointercancel", onWinPointerUp);
    return () => {
      window.removeEventListener("pointerup", onWinPointerUp);
      window.removeEventListener("pointercancel", onWinPointerUp);
    };
  }, [onPlayUp]);

  return (
    <section className="td-stage" aria-label="Heart monitor device">
      <img
        className="td-device"
        src="/1-800-demo/1-800-device-front-cropped.webp"
        alt=""
        draggable={false}
      />
      {/* Pressed button overlay. Same 634×634 frame as the default image
          with the surrounding pixels fully transparent — so alignment is
          automatic (same position + sizing rules). Always in the DOM so
          the browser keeps it decoded for a zero-flicker swap. */}
      <img
        className={`td-device ${pressed ? "" : "td-device--hidden"}`}
        src="/1-800-demo/1-800-device-pressed-button.webp"
        alt=""
        draggable={false}
      />
      <div className="td-screen">{children}</div>
      <button
        type="button"
        className="td-play-btn"
        aria-label="Flap / Play"
        onPointerDown={handlePlayDown}
        onPointerUp={handlePlayUp}
        onPointerCancel={handlePlayUp}
      />
      <button
        type="button"
        className="td-heart-btn"
        aria-label="Restart"
        onPointerDown={handleHeartDown}
      />
    </section>
  );
}
