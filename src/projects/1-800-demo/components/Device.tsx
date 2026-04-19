import { useEffect } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";

interface Props {
  children: ReactNode;
  onPlayDown: () => void;
  onPlayUp: () => void;
  onHeartDown: () => void;
}

export function Device({ children, onPlayDown, onPlayUp, onHeartDown }: Props) {
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

  // Safety net for iOS Safari: if any pointer is released anywhere on the
  // document while play is being held (finger dragged off the button, then
  // lifted) ensure we clear the flap-hold state.
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
        src="/1-800-demo/1-800-device-front-cropped.png"
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
