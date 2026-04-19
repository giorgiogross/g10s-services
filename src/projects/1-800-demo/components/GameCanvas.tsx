import { useImperativeHandle, useRef, type Ref } from "react";
import { useFlappyGame } from "../hooks/useFlappyGame";
import { PLAY_H, PLAY_W } from "../services/levelDesign";

export interface GameCanvasHandle {
  flap: () => void;
  setFlapHold: (pressed: boolean) => void;
}

interface Props {
  ref?: Ref<GameCanvasHandle>;
}

export function GameCanvas({ ref }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const api = useFlappyGame(canvasRef);
  useImperativeHandle(
    ref,
    () => ({ flap: api.flap, setFlapHold: api.setFlapHold }),
    [api],
  );
  return (
    <canvas
      ref={canvasRef}
      className="td-canvas"
      width={PLAY_W}
      height={PLAY_H}
    />
  );
}
