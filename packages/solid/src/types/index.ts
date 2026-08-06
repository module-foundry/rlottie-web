import type {
  LottieSource,
  RLottieDiagnostics,
  RLottieMetadata,
  RLottieQualitySnapshot,
  RLottieSeekTarget,
  RLottieStatus,
} from "@module-foundry/rlottie-web";
import type { Accessor } from "solid-js";

/** Return value of the SolidJS adapter. */
export interface CreateRLottieResult {
  canvasRef(element: HTMLCanvasElement): void;
  error: Accessor<Error | null>;
  metadata: Accessor<RLottieMetadata | null>;
  pause(): void;
  play(): void;
  quality: Accessor<RLottieQualitySnapshot>;
  seek(target: RLottieSeekTarget): void;
  start(source: LottieSource): Promise<RLottieMetadata>;
  status: Accessor<RLottieStatus>;
  stop(): void;
  /** Subscribe to windowed worker diagnostics without creating reactive frame updates. */
  subscribeDiagnostics(listener: (diagnostics: RLottieDiagnostics) => void): () => void;
}
