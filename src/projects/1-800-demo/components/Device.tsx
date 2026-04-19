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
    e.currentTarget.setPointerCapture?.(e.pointerId);
    onPlayDown();
  };
  const handleHeartDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onHeartDown();
  };

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
        onPointerUp={onPlayUp}
        onPointerCancel={onPlayUp}
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
