import type {
  LottieSource,
  RLottieDiagnostics,
  RLottieMetadata,
  RLottieSeekTarget,
  RLottieSnapshot,
} from "@module-foundry/rlottie-web";
import type { RefCallback } from "react";

/** Return value of the React adapter. */
export interface UseRLottieResult extends RLottieSnapshot {
  canvasRef: RefCallback<HTMLCanvasElement>;
  pause(this: void): void;
  play(this: void): void;
  seek(this: void, target: RLottieSeekTarget): void;
  start(this: void, source: LottieSource): Promise<RLottieMetadata>;
  stop(this: void): void;
  /** Subscribe to windowed worker diagnostics without causing frame-level React updates. */
  subscribeDiagnostics(this: void, listener: (diagnostics: RLottieDiagnostics) => void): () => void;
}
